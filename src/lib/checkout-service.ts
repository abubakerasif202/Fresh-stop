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
import { buildSessionParams, toStripeLike, type StripeLike, type StripeSessionLike } from "./checkout-stripe";
import { db } from "./db";
import { StockConflictError, releaseExpiredReservations } from "./inventory";
import { generateOrderAccessToken } from "./order-access";
import { validateAndPriceOrder, type ValidatedOrderResult } from "./order-pricing";
import { getClientIp, sharedRateLimit, type RateLimitOptions, type RateLimitResult } from "./rate-limit";
import { SITE_URL } from "./site";
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
    siteBase: () => process.env.NEXT_PUBLIC_SITE_URL || SITE_URL
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

async function respondForExisting(existing: ExistingOrder, input: CheckoutInput, stripe: StripeLike): Promise<Response> {
  if (!isSameCart(existing, input)) {
    return fail(409, "IDEMPOTENCY_KEY_REUSED", "This request key was already used for a different order.");
  }
  const open = existing.paymentStatus === "PENDING" && existing.orderStatus === "PENDING_PAYMENT";
  if (!open || !existing.stripeSessionId) {
    return fail(409, "IDEMPOTENCY_KEY_USED", "This order is already being processed or has finished.");
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(existing.stripeSessionId);
    if (session.status === "open" && session.url) {
      // The access token is never stored (only its hash), so a replay cannot return it again.
      return jsonResponse(200, {
        url: session.url,
        sessionId: session.id,
        orderNumber: existing.orderNumber,
        orderId: existing.id,
        accessToken: null,
        replayed: true
      });
    }
  } catch (error) {
    logSafe("session retrieve failed", error);
    return fail(502, "PAYMENT_PROVIDER_ERROR", "Unable to resume checkout. Please try again.");
  }
  return fail(409, "IDEMPOTENCY_KEY_USED", "This checkout session has ended. Please start a new checkout.");
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
  return stripe.checkout.sessions.create(params, { idempotencyKey: `fs-checkout-${order.id}` });
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
    await abandonOrder(deps.db, order.id, deps.now());
    return fail(502, "PAYMENT_PROVIDER_ERROR", "Unable to start payment. Please try again.");
  }
  try {
    await deps.db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  } catch (error) {
    logSafe("saving stripe session failed", error);
    await stripe.checkout.sessions.expire?.(session.id).catch(() => undefined);
    await abandonOrder(deps.db, order.id, deps.now());
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
    if (existing) return await respondForExisting(existing, input, stripe);
  } catch (error) {
    logSafe("idempotency replay failed", error);
  }
  return fail(409, "IDEMPOTENCY_KEY_USED", "This order is already being processed. Please wait a moment.");
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
    if (input.idempotencyKey) {
      const existing = await findOrderByIdempotencyKey(deps.db, input.idempotencyKey);
      if (existing) return await respondForExisting(existing, input, stripe);
    }
    await sweepExpired(deps);
    return await pricingAndCreate(deps, stripe, input);
  } catch (error) {
    logSafe("checkout failed", error);
    return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable. Please try again.");
  }
}

export async function handleCheckout(request: Request, deps: CheckoutDeps = createDefaultCheckoutDeps()): Promise<Response> {
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
