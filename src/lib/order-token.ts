import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Unguessable capability token for an order confirmation link.
 * token = base64url(HMAC-SHA256(ORDER_TOKEN_SECRET, orderId)).slice(0, 32)
 * No schema change needed; existing orders simply have no link token and fall
 * back to the email-verification flow.
 */
const TOKEN_LENGTH = 32;

function secret(): string | null {
  const value = process.env.ORDER_TOKEN_SECRET?.trim();
  return value && value.length >= 16 ? value : null;
}

export function signOrderToken(orderId: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(orderId).digest("base64url").slice(0, TOKEN_LENGTH);
}

export function verifyOrderToken(orderId: string, token: string | null | undefined): boolean {
  if (!token || token.length !== TOKEN_LENGTH) return false;
  const expected = signOrderToken(orderId);
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}
