import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { sameOrigin } from "./admin-route";
import { jsonResponse } from "./checkout-service";
import { db } from "./db";
import { resolveTransport, type EmailTransport } from "./email";
import { sendEnquiryEmail } from "./enquiry-email";
import { MAX_ENQUIRY_BODY_BYTES, validateEnquiryBody } from "./enquiry-input";
import { getClientIp, sharedRateLimit, type RateLimitOptions, type RateLimitResult } from "./rate-limit";

/** POST /api/enquiries orchestration: guard, validate, persist first, then notify the owner (best effort). */

export const ENQUIRY_RATE_LIMIT: RateLimitOptions = { limit: 5, windowMs: 10 * 60 * 1000 };

export interface EnquiryDeps {
  db: PrismaClient;
  rateLimit: (key: string, options: RateLimitOptions) => Promise<RateLimitResult>;
  getTransport: () => EmailTransport | null;
  hashIp: (ip: string) => string | null;
}

/** One-way hash so abuse can be correlated without storing the address itself. */
export function hashClientIp(ip: string): string | null {
  if (!ip || ip === "unknown") return null;
  const salt = process.env.ORDER_ACCESS_SECRET || process.env.CRON_SECRET || "fresh-stop-enquiry";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function defaultEnquiryDeps(): EnquiryDeps {
  return { db, rateLimit: (key, options) => sharedRateLimit(key, options), getTransport: resolveTransport, hashIp: hashClientIp };
}

const FALLBACK = "Please call or email us instead.";

async function readLimitedText(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_ENQUIRY_BODY_BYTES) return null;
  const raw = await request.text();
  return Buffer.byteLength(raw, "utf8") > MAX_ENQUIRY_BODY_BYTES ? null : raw;
}

export async function handleEnquiry(request: Request, deps: EnquiryDeps = defaultEnquiryDeps()): Promise<Response> {
  if (!sameOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site") {
    return jsonResponse(403, { code: "BAD_ORIGIN", error: "Invalid request origin." });
  }
  const ip = getClientIp(request.headers);
  const limit = await deps.rateLimit(`enquiry:${ip}`, ENQUIRY_RATE_LIMIT);
  const retry = { "Retry-After": String(limit.retryAfterSec) };
  if (limit.unavailable) return jsonResponse(503, { code: "UNAVAILABLE", error: `Temporarily unavailable. ${FALLBACK}` }, retry);
  if (!limit.ok) return jsonResponse(429, { code: "RATE_LIMITED", error: "Too many requests. Please try again shortly." }, retry);

  let parsed: unknown;
  try {
    const raw = await readLimitedText(request);
    if (raw === null) return jsonResponse(413, { code: "PAYLOAD_TOO_LARGE", error: "Your message is too long." });
    parsed = JSON.parse(raw);
  } catch {
    return jsonResponse(400, { code: "INVALID_REQUEST", error: "Invalid request." });
  }

  const result = validateEnquiryBody(parsed);
  // Bots get an identical success response and nothing is stored or sent.
  if (!result.ok && result.honeypotTripped) return jsonResponse(201, { ok: true, notified: true });
  if (!result.ok) return jsonResponse(400, { code: "INVALID_INPUT", error: "Please check the highlighted fields.", fields: result.errors });

  let id: string;
  try {
    const row = await deps.db.enquiry.create({ data: { ...result.value, ipHash: deps.hashIp(ip) }, select: { id: true } });
    id = row.id;
  } catch {
    console.error("[enquiry] persist failed");
    return jsonResponse(503, { code: "UNAVAILABLE", error: `We could not save your enquiry. ${FALLBACK}` });
  }
  const email = await sendEnquiryEmail(id, { transport: deps.getTransport(), client: deps.db });
  return jsonResponse(201, { ok: true, notified: email.sent });
}
