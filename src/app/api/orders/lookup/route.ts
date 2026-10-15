import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { signOrderToken } from "@/lib/order-token";
import { emailsMatch, LOOKUP_FAILURE_MESSAGE, parseLookupBody } from "@/lib/order-lookup";

export const dynamic = "force-dynamic";

const WINDOW_MS = 10 * 60 * 1000;
const PER_ORDER_LIMIT = { limit: 6, windowMs: WINDOW_MS };
const PER_IP_LIMIT = { limit: 20, windowMs: WINDOW_MS };
const NO_STORE = { "Cache-Control": "no-store" };

function fail(status: number, headers: Record<string, string> = {}) {
  return NextResponse.json(
    { error: LOOKUP_FAILURE_MESSAGE },
    { status, headers: { ...NO_STORE, ...headers } }
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);

  const ipState = rateLimit(`lookup-ip:${ip}`, PER_IP_LIMIT);
  if (!ipState.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(ipState.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400);
  }
  const input = parseLookupBody(body);
  if (!input) return fail(400);

  const orderState = rateLimit(`lookup-order:${ip}:${input.orderId}`, PER_ORDER_LIMIT);
  if (!orderState.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(orderState.retryAfterSec) } }
    );
  }

  const token = signOrderToken(input.orderId);
  if (!token) {
    return NextResponse.json(
      { error: "Order lookup is not configured." },
      { status: 503, headers: NO_STORE }
    );
  }

  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, customerEmail: true }
  });

  // Same response for "no such order" and "email mismatch".
  const matched = emailsMatch(order?.customerEmail ?? "", input.email);
  if (!order || !matched) return fail(404);

  return NextResponse.json({ token }, { headers: NO_STORE });
}
