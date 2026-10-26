import { sameOrigin } from "./admin-route";
import type { PrismaClient } from "@prisma/client";
import { getPaidCheckoutStatus, type PaidCheckoutStatus } from "./commerce-gate";
import { MAX_BODY_BYTES, validateCheckoutBody, type CheckoutInput } from "./checkout-input";
import {
  abandonOrder,
  findOrderByIdempotencyKey,
  isSameCart,
  isUniqueViolation,
  persistOrder,
  type ExistingOrder,
  type PersistedOrder
} from "./checkout-persist";
import { buildSessionParams, RESERVATION_TTL_MINUTES, toStripeLike, type StripeLike, type StripeSessionLike } from "./checkout-stripe";
import { db } from "./db";
import { StockConflictError, releaseExpiredReservations } from "./inventory";
import { generateOrderAccessToken } from "./order-access";
import { validateAndPriceOrder, type ValidatedOrderResult } from "./order-pricing";
import { getClientIp, sharedRateLimit, type RateLimitOptions, type RateLimitResult } from "./rate-limit";
import { checkoutReturnBase } from "./checkout-return-base";
import { getStripe, verifyStripeAccount } from "./stripe";

/** Request orchestration for POST /api/checkout/stripe. Route files stay thin; everything is injectable. */

export const CHECKOUT_RATE_LIMIT: RateLimitOptions = { limit: 10, windowMs: 10 * 60 * 1000 };

export interface CheckoutDeps {
  db: PrismaClient;
  getStripe: () => StripeLike | null | Promise<StripeLike | null>;
  getGate: (fulfillment: "DELIVERY" | "PICKUP") => Promise<PaidCheckoutStatus>;
  rateLimit: (key: string, options: RateLimitOptions) => Promise<RateLimitResult>;
  now: () => Date;
  siteBase: () => string;
}

/** Null when Stripe is unconfigured or the key is not permitted (e.g. a live key). */
async function resolveStripe(): Promise<StripeLike | null> {
  try {
    const client = getStripe();
    return client && (await verifyStripeAccount(client)).ok ? toStripeLike(client) : null;
  } catch {
    return null;
  }
}

export function createDefaultCheckoutDeps(): CheckoutDeps {
  return {
    db,
    getStripe: resolveStripe,
    getGate: (fulfillment) => getPaidCheckoutStatus({ fulfillment }),
    rateLimit: (key, options) => sharedRateLimit(key, options),
    now: () => new Date(),
    siteBase: () => checkoutReturnBase()
  };
}

const NO_STORE = { "Cache-Control": "no-store" };

export function jsonResponse(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function fail(status: number, code: string, error: string, extra: Record<string, unknown> = {}, headers?: Record<string, string>): Response {
  return jsonResponse(status, { error, code, ...extra }, headers);
}

/** Logs only the error class and code: error messages can embed customer data. */
function logSafe(event: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const code = typeof (error as { code?: unknown } | null)?.code === "string" ? (error as { code: string }).code : "";
  console.error(`[checkout] ${event} ${name}${code ? ` ${code}` : ""}`);
}

async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return { ok: false, response: fail(413, "PAYLOAD_TOO_LARGE", "Request is too large.") };
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: fail(400, "VALIDATION", "Invalid request.") };
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return { ok: false, response: fail(413, "PAYLOAD_TOO_LARGE", "Request is too large.") };
  try {
    return { ok: true, body: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, response: fail(400, "VALIDATION", "Invalid request.") };
  }
}

function gateFailure(status: PaidCheckoutStatus): Response {
  const codes = status.codes;
  if (codes.includes("DB_ERROR")) return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable.");
  const stripeOnly = codes.length > 0 && codes.every((c) => c.startsWith("STRIPE_"));
  if (stripeOnly) return fail(503, "STRIPE_NOT_CONFIGURED", "Online payment is not available at the moment.");
  return fail(503, "CHECKOUT_DISABLED", "Online checkout is not available at the moment. Please enquire.");
}

function unresolvedCheckout(): Response {
  return fail(409, "IDEMPOTENCY_IN_PROGRESS", "This checkout is still being confirmed. Retry the same checkout, or contact the store if this continues.");
}

async function recoverSession(deps: CheckoutDeps, existing: ExistingOrder, stripe: StripeLike): Promise<string | Response> {
  const list = stripe.checkout.sessions.listRecent;
  if (!list) return unresolvedCheckout();
  try {
    const result = await list(Math.floor(existing.createdAt.getTime() / 1000) - 60);
    if (!result.complete) return unresolvedCheckout();
    const matches = result.sessions.filter((session) => session.client_reference_id === existing.id &&
      session.metadata?.orderId === existing.id && session.metadata?.orderNumber === existing.orderNumber);
    if (matches.length === 0) {
      const conflictingReference = result.sessions.some((session) => session.client_reference_id === existing.id ||
        session.metadata?.orderId === existing.id || session.metadata?.orderNumber === existing.orderNumber);
      if (conflictingReference) return unresolvedCheckout();
      // A complete provider read after bounded reservation expiry confirms there
      // is no payable session to resume. Never create again using the old key.
      if (deps.now().getTime() >= existing.createdAt.getTime() + RESERVATION_TTL_MINUTES * 60_000) {
        return fail(409, "IDEMPOTENCY_KEY_USED", "This checkout expired. Please start a new checkout.");
      }
      return unresolvedCheckout();
    }
    if (matches.length !== 1) return unresolvedCheckout();
    const session = matches[0];
    if (session.mode !== "payment" || session.currency !== "aud" || session.amount_total !== existing.totalCents) return unresolvedCheckout();
    const attached = await deps.db.order.updateMany({
      where: { id: existing.id, stripeSessionId: null }, data: { stripeSessionId: session.id }
    });
    if (attached.count !== 1) {
      const current = await deps.db.order.findUnique({ where: { id: existing.id }, select: { stripeSessionId: true } });
      if (current?.stripeSessionId !== session.id) return unresolvedCheckout();
    }
    return session.id;
  } catch (error) {
    logSafe("session recovery failed", error);
    return unresolvedCheckout();
  }
}

async function respondForExisting(deps: CheckoutDeps, existing: ExistingOrder, input: CheckoutInput, stripe: StripeLike): Promise<Response> {
  if (!isSameCart(existing, input)) {
    return fail(409, "IDEMPOTENCY_KEY_REUSED", "This request key was already used for a different order.");
  }
  if (existing.paymentStatus === "PAID" || existing.paymentStatus === "REFUNDED" || existing.paymentStatus === "PARTIALLY_REFUNDED") {
    return fail(409, "IDEMPOTENCY_KEY_USED", "This order has already been paid.");
  }
  if (!existing.stripeSessionId && existing.paymentStatus === "FAILED" && existing.orderStatus === "CANCELLED") {
    return fail(409, "IDEMPOTENCY_KEY_USED", "This checkout was cancelled. Please start a new checkout.");
  }
  let sessionId = existing.stripeSessionId;
  if (!sessionId) {
    const recovered = await recoverSession(deps, existing, stripe);
    if (recovered instanceof Response) return recovered;
    sessionId = recovered;
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "complete") return unresolvedCheckout();
    if (session.status === "expired") return fail(409, "IDEMPOTENCY_KEY_USED", "This checkout session has ended. Please start a new checkout.");
    const open = existing.paymentStatus === "PENDING" && existing.orderStatus === "PENDING_PAYMENT";
    if (session.status === "open" && session.url && open) {
      // The original Stripe URL retains the success URL's original access token.
      return jsonResponse(200, {
        url: session.url,
        sessionId: session.id,
        orderNumber: existing.orderNumber,
        orderId: existing.id,
        accessToken: null,
        replayed: true
      });
    }
    return unresolvedCheckout();
  } catch (error) {
    logSafe("session retrieve failed", error);
    return fail(502, "PAYMENT_PROVIDER_ERROR", "Unable to resume checkout. Please try again.");
  }
}

async function createStripeSession(
  deps: CheckoutDeps,
  stripe: StripeLike,
  order: PersistedOrder,
  input: CheckoutInput,
  priced: ValidatedOrderResult,
  token: string
): Promise<StripeSessionLike> {
  const params = buildSessionParams(priced, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerEmail: input.customer.email,
    accessToken: token,
    siteBase: deps.siteBase(),
    nowMs: deps.now().getTime()
  });
  return stripe.checkout.sessions.create({
    ...params,
    ui_mode: "hosted_page",
    billing_address_collection: "auto",
    phone_number_collection: { enabled: false },
    automatic_tax: { enabled: false },
    allow_promotion_codes: false,
    submit_type: "auto",
    integration_identifier: "hosted_web_0001",
    origin_context: "web"
  }, { idempotencyKey: `fs-checkout-${order.id}` });
}

/** Only a definitive Stripe rejection proves that no session was created. */
function isDefinitiveSessionRejection(error: unknown): boolean {
  const type = (error as { type?: unknown } | null)?.type;
  return typeof type === "string" && ["StripeInvalidRequestError", "StripeAuthenticationError", "StripePermissionError", "StripeCardError"].includes(type);
}

async function finishWithStripe(
  deps: CheckoutDeps,
  stripe: StripeLike,
  order: PersistedOrder,
  input: CheckoutInput,
  priced: ValidatedOrderResult,
  token: string
): Promise<Response> {
  let session: StripeSessionLike;
  try {
    session = await createStripeSession(deps, stripe, order, input, priced, token);
    if (!session.url) throw new Error("Stripe returned no checkout URL");
  } catch (error) {
    logSafe("stripe session creation failed", error);
    if (isDefinitiveSessionRejection(error)) {
      await abandonOrder(deps.db, order.id, deps.now());
      return fail(502, "PAYMENT_PROVIDER_ERROR", "Unable to start payment. Please try again.");
    }
    // The provider may have created a session despite a lost response. Hold the
    // reservation and request key until expiry rather than start another order.
    return fail(502, "PAYMENT_PROVIDER_UNCERTAIN", "Checkout is still being confirmed. Wait a moment and retry without changing your cart.");
  }
  try {
    await deps.db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  } catch (error) {
    logSafe("saving stripe session failed", error);
    let expired = false;
    try {
      if (stripe.checkout.sessions.expire) {
        await stripe.checkout.sessions.expire(session.id);
        expired = true;
      }
    } catch (error) {
      logSafe("session expiry compensation uncertain", error);
    }
    // Never free stock while a provider session may remain payable. A pending
    // order is visible to administration and the reservation has a bounded TTL.
    if (expired) await abandonOrder(deps.db, order.id, deps.now());
    return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable. Please try again.");
  }
  return jsonResponse(200, {
    url: session.url,
    sessionId: session.id,
    orderNumber: order.orderNumber,
    orderId: order.id,
    accessToken: token
  });
}

async function createOrderAndPay(deps: CheckoutDeps, stripe: StripeLike, input: CheckoutInput, priced: ValidatedOrderResult): Promise<Response> {
  const { token, hash } = generateOrderAccessToken();
  let order: PersistedOrder;
  try {
    order = await persistOrder(deps.db, input, priced, hash, deps.now());
  } catch (error) {
    if (error instanceof StockConflictError) {
      return fail(409, "CONFLICT", "Some items are no longer available in the quantity requested.", { conflicts: error.conflicts });
    }
    if (input.idempotencyKey && isUniqueViolation(error, "idempotencyKey")) {
      return replayAfterRace(deps, stripe, input);
    }
    logSafe("order creation failed", error);
    return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable. Please try again.");
  }
  return finishWithStripe(deps, stripe, order, input, priced, token);
}

async function replayAfterRace(deps: CheckoutDeps, stripe: StripeLike, input: CheckoutInput): Promise<Response> {
  try {
    const existing = input.idempotencyKey ? await findOrderByIdempotencyKey(deps.db, input.idempotencyKey) : null;
    if (existing) return await respondForExisting(deps, existing, input, stripe);
  } catch (error) {
    logSafe("idempotency replay failed", error);
  }
  return fail(409, "IDEMPOTENCY_IN_PROGRESS", "This order is already being processed. Please wait a moment.");
}

async function pricingAndCreate(deps: CheckoutDeps, stripe: StripeLike, input: CheckoutInput): Promise<Response> {
  const priced = await validateAndPriceOrder(input.items, input.customer.postcode, input.fulfillmentType, deps.db);
  if (!priced.ok) {
    return fail(priced.status, priced.code, priced.error, priced.conflicts ? { conflicts: priced.conflicts } : {});
  }
  return createOrderAndPay(deps, stripe, input, priced);
}

async function sweepExpired(deps: CheckoutDeps): Promise<void> {
  try {
    await releaseExpiredReservations(deps.now(), deps.db);
  } catch (error) {
    logSafe("expiry sweep failed", error);
  }
}

async function processValidated(deps: CheckoutDeps, input: CheckoutInput): Promise<Response> {
  const stripe = await deps.getStripe();
  if (!stripe) return fail(503, "STRIPE_NOT_CONFIGURED", "Online payment is not available at the moment.");
  try {
    await sweepExpired(deps);
    if (input.idempotencyKey) {
      const existing = await findOrderByIdempotencyKey(deps.db, input.idempotencyKey);
      if (existing) return await respondForExisting(deps, existing, input, stripe);
    }
    return await pricingAndCreate(deps, stripe, input);
  } catch (error) {
    logSafe("checkout failed", error);
    return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable. Please try again.");
  }
}

export async function handleCheckout(request: Request, deps: CheckoutDeps = createDefaultCheckoutDeps()): Promise<Response> {
  if (!sameOrigin(request)) return fail(403, "ORIGIN_REJECTED", "Checkout must be started from this website.");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return fail(415, "CONTENT_TYPE", "Checkout requires a JSON request.");
  }
  const limit = await deps.rateLimit(`checkout:${getClientIp(request.headers)}`, CHECKOUT_RATE_LIMIT);
  if (limit.unavailable) return fail(503, "RATE_LIMIT_UNAVAILABLE", "Checkout is temporarily unavailable.", {}, { "Retry-After": String(limit.retryAfterSec) });
  if (!limit.ok) return fail(429, "RATE_LIMITED", "Too many attempts. Please try again later.", {}, { "Retry-After": String(limit.retryAfterSec) });

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const wanted = (parsed.body as { fulfillmentType?: unknown } | null)?.fulfillmentType === "PICKUP" ? "PICKUP" : "DELIVERY";

  // The gate runs before anything is written. A gate read failure is DB_UNAVAILABLE (fail closed).
  const gate = await deps.getGate(wanted).catch((error: unknown) => {
    logSafe("gate check failed", error);
    return null;
  });
  if (!gate) return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable.");
  if (!gate.enabled) return gateFailure(gate);

  const validated = validateCheckoutBody(parsed.body);
  if (!validated.ok) return fail(400, "VALIDATION", "Please check the highlighted details.", { details: validated.errors });
  return processValidated(deps, validated.value);
}
