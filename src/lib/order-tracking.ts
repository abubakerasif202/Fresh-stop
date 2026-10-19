import { createHmac, timingSafeEqual } from "node:crypto";

export interface OrderTrackingScope {
  id: string;
  orderNumber: string;
  accessTokenHash: string | null;
}

const LIFETIME_SECONDS = 30 * 24 * 60 * 60;

function signingSecret(): string | null {
  const secret = process.env.ORDER_ACCESS_SECRET;
  return secret && Buffer.byteLength(secret, "utf8") >= 32 ? secret : null;
}

function signature(order: OrderTrackingScope, expires: number, secret: string): string {
  return createHmac("sha256", secret)
    .update(JSON.stringify(["fresh-stop:order-tracking:v1", order.id, order.orderNumber, order.accessTokenHash, expires]))
    .digest("base64url");
}

/** A limited-life email credential, scoped to one order and revoked by changing its stored access hash. */
export function createOrderTrackingToken(order: OrderTrackingScope, now = Date.now()): string | null {
  const secret = signingSecret();
  if (!secret) return null;
  const expires = Math.floor(now / 1000) + LIFETIME_SECONDS;
  return `v1.${expires}.${signature(order, expires, secret)}`;
}

export function verifyOrderTrackingToken(token: unknown, order: OrderTrackingScope, now = Date.now()): boolean {
  const secret = signingSecret();
  if (!secret || typeof token !== "string") return false;
  const match = /^v1\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[1]);
  const seconds = Math.floor(now / 1000);
  if (expires <= seconds || expires > seconds + LIFETIME_SECONDS) return false;
  const expected = Buffer.from(signature(order, expires, secret));
  const provided = Buffer.from(match[2]);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
