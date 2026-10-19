import { NextResponse } from "next/server";
import { findAccessibleOrder, normalizeOrderRef, toPublicOrderView } from "@/lib/order-lookup";
import { getClientIp, sharedRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const IP_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };
const ORDER_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow"
};

const json = (body: Record<string, unknown>, status: number, extra: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...PRIVATE_HEADERS, ...extra } });

const NOT_FOUND = () => json({ error: "No matching order found. Check the order number and access code." }, 404);

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 2048) {
    return json({ error: "Request is too large." }, 413);
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 2048) return json({ error: "Request is too large." }, 413);
    body = JSON.parse(raw) as unknown;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const orderRef = normalizeOrderRef(payload.orderNumber);
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  if (!orderRef || !token) return json({ error: "Enter your order number and access code." }, 400);

  const ip = await sharedRateLimit(`order-lookup:ip:${getClientIp(request.headers)}`, IP_LIMIT);
  const perOrder = ip.ok ? await sharedRateLimit(`order-lookup:ref:${orderRef}`, ORDER_LIMIT) : ip;
  if (!perOrder.ok) {
    const status = perOrder.unavailable ? 503 : 429;
    return json({ error: "Too many attempts. Please try again later." }, status, { "Retry-After": String(perOrder.retryAfterSec) });
  }

  try {
    const order = await findAccessibleOrder(orderRef, token);
    return order ? json({ success: true, order: toPublicOrderView(order) }, 200) : NOT_FOUND();
  } catch {
    return json({ error: "Unable to look up order." }, 500);
  }
}
