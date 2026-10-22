import type { PrismaClient } from "@prisma/client";
import { getPaidCheckoutStatus, type PaidCheckoutStatus } from "./commerce-gate";
import { jsonResponse } from "./checkout-service";
import { db } from "./db";
import { checkDelivery, type DeliveryCheckResult } from "./delivery";
import { releaseExpiredReservations } from "./inventory";
import { retryPendingOrderEmails } from "./email";
import { retryPendingEnquiryEmails } from "./enquiry-email";
import { getClientIp, sharedRateLimit, type RateLimitOptions, type RateLimitResult } from "./rate-limit";

/** Handlers for the small public checkout endpoints (status, delivery check, expiry sweep). */

export const STATUS_RATE_LIMIT: RateLimitOptions = { limit: 60, windowMs: 60 * 1000 };
export const DELIVERY_RATE_LIMIT: RateLimitOptions = { limit: 60, windowMs: 60 * 1000 };

type Limiter = (key: string, options: RateLimitOptions) => Promise<RateLimitResult>;

export interface PublicHandlerDeps {
  rateLimit: Limiter;
  getGate: (fulfillment: "DELIVERY" | "PICKUP") => Promise<PaidCheckoutStatus>;
  checkDelivery: (postcode: string, subtotalCents: number) => Promise<DeliveryCheckResult>;
}

export function defaultPublicHandlerDeps(): PublicHandlerDeps {
  return {
    rateLimit: (key, options) => sharedRateLimit(key, options),
    getGate: (fulfillment) => getPaidCheckoutStatus({ fulfillment }),
    checkDelivery: (postcode, subtotalCents) => checkDelivery(postcode, subtotalCents)
  };
}

async function limited(request: Request, scope: string, options: RateLimitOptions, deps: PublicHandlerDeps): Promise<Response | null> {
  const state = await deps.rateLimit(`${scope}:${getClientIp(request.headers)}`, options);
  const headers = { "Retry-After": String(state.retryAfterSec) };
  if (state.unavailable) return jsonResponse(503, { code: "RATE_LIMIT_UNAVAILABLE", error: "Temporarily unavailable." }, headers);
  if (!state.ok) return jsonResponse(429, { code: "RATE_LIMITED", error: "Too many requests." }, headers);
  return null;
}

/** GET /api/checkout/status -> { enabled, reasons? } with generic reasons only. */
export async function handleCheckoutStatus(request: Request, deps: PublicHandlerDeps = defaultPublicHandlerDeps()): Promise<Response> {
  const blocked = await limited(request, "checkout-status", STATUS_RATE_LIMIT, deps);
  if (blocked) return blocked;
  const fulfillment = new URL(request.url).searchParams.get("fulfillment") === "PICKUP" ? "PICKUP" : "DELIVERY";
  try {
    const status = await deps.getGate(fulfillment);
    return jsonResponse(200, status.enabled ? { enabled: true } : { enabled: false, reasons: status.reasons });
  } catch {
    return jsonResponse(200, { enabled: false, reasons: ["Online checkout is not available at the moment. Please enquire and we will help."] });
  }
}

function publicDelivery(result: DeliveryCheckResult): Record<string, unknown> {
  if (!result.eligible) {
    return { eligible: false, code: result.code, message: result.message, ...(result.minOrderCents !== undefined ? { minOrderCents: result.minOrderCents } : {}) };
  }
  return {
    eligible: true,
    zoneName: result.zoneName,
    deliveryFeeCents: result.deliveryFeeCents,
    freeDeliveryMinCents: result.freeDeliveryMinCents,
    minOrderCents: result.minOrderCents,
    message: result.message
  };
}

/** Accepts integer cents (`subtotalCents`) or, for older callers, dollars (`subtotal`). */
function subtotalCentsFrom(source: { subtotalCents?: unknown; subtotal?: unknown }): number {
  const cents = source.subtotalCents;
  if (typeof cents === "number" && Number.isSafeInteger(cents) && cents >= 0) return cents;
  const dollars = source.subtotal;
  if (typeof dollars === "number" && Number.isFinite(dollars) && dollars >= 0 && dollars < 1_000_000) return Math.round(dollars * 100);
  return 0;
}

async function runDelivery(postcode: unknown, subtotalCents: number, deps: PublicHandlerDeps): Promise<Response> {
  if (typeof postcode !== "string" || postcode.trim() === "") {
    return jsonResponse(400, { eligible: false, code: "INVALID_POSTCODE", message: "Please provide a delivery postcode." });
  }
  try {
    const result = await deps.checkDelivery(postcode, subtotalCents);
    const status = !result.eligible && result.code === "DB_UNAVAILABLE" ? 503 : 200;
    return jsonResponse(status, publicDelivery(result));
  } catch {
    return jsonResponse(503, { eligible: false, code: "DB_UNAVAILABLE", message: "Delivery options are temporarily unavailable." });
  }
}

export async function handleDeliveryCheck(request: Request, deps: PublicHandlerDeps = defaultPublicHandlerDeps()): Promise<Response> {
  const blocked = await limited(request, "delivery-check", DELIVERY_RATE_LIMIT, deps);
  if (blocked) return blocked;
  if (request.method === "GET") {
    const params = new URL(request.url).searchParams;
    const subtotal = params.get("subtotal");
    const cents = params.get("subtotalCents");
    return runDelivery(params.get("postcode"), subtotalCentsFrom({
      subtotalCents: cents === null ? undefined : Number(cents),
      subtotal: subtotal === null ? undefined : Number(subtotal)
    }), deps);
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > 2048) return jsonResponse(413, { eligible: false, code: "PAYLOAD_TOO_LARGE", message: "Request is too large." });
  let body: { postcode?: unknown; subtotalCents?: unknown; subtotal?: unknown } = {};
  try {
    const raw = await request.text();
    if (raw.length > 2048) return jsonResponse(413, { eligible: false, code: "PAYLOAD_TOO_LARGE", message: "Request is too large." });
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) body = parsed as typeof body;
  } catch {
    return jsonResponse(400, { eligible: false, code: "INVALID_POSTCODE", message: "Please provide a delivery postcode." });
  }
  return runDelivery(body.postcode, subtotalCentsFrom(body), deps);
}

/** Authorised expiry sweep for a scheduler. Fails closed when CRON_SECRET is not configured. */
export async function handleExpireSweep(
  request: Request,
  env: Readonly<Record<string, string | undefined>> = process.env,
  client: PrismaClient = db
): Promise<Response> {
  const secret = env.CRON_SECRET;
  if (!secret) return jsonResponse(503, { code: "NOT_CONFIGURED", error: "Not available." });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return jsonResponse(401, { code: "UNAUTHORIZED", error: "Unauthorized." });
  try {
    const expired = await releaseExpiredReservations(new Date(), client);
    const emails = await retryPendingOrderEmails(20);
    const enquiries = await retryPendingEnquiryEmails(20);
    return jsonResponse(emails.failed || enquiries.failed ? 503 : 200, { expired, emails, enquiries });
  } catch {
    return jsonResponse(503, { code: "DB_UNAVAILABLE", error: "Unavailable." });
  }
}
