/** Pure helpers for the order-confirmation email verification flow. */

export const LOOKUP_FAILURE_MESSAGE = "We couldn't verify that order.";

const MAX_ID_LENGTH = 64;
const MAX_EMAIL_LENGTH = 254;

export interface LookupInput {
  orderId: string;
  email: string;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Case-insensitive, whitespace-trimmed, constant-time email comparison. */
export function emailsMatch(a: string, b: string): boolean {
  const x = normalizeEmail(a);
  const y = normalizeEmail(b);
  if (!x || !y) return false;
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Validates an untrusted request body; returns null when malformed. */
export function parseLookupBody(body: unknown): LookupInput | null {
  if (typeof body !== "object" || body === null) return null;
  const { orderId, email } = body as Record<string, unknown>;
  if (typeof orderId !== "string" || typeof email !== "string") return null;
  const id = orderId.trim();
  const mail = email.trim();
  if (!id || id.length > MAX_ID_LENGTH || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  if (!mail || mail.length > MAX_EMAIL_LENGTH) return null;
  return { orderId: id, email: mail };
}
