import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface OrderAccessToken {
  token: string;
  hash: string;
}

export function hashOrderAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOrderAccessToken(): OrderAccessToken {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashOrderAccessToken(token) };
}

/** Constant-time check of a presented token against the stored hash. */
export function verifyOrderAccessToken(token: unknown, storedHash: string | null | undefined): boolean {
  if (typeof token !== "string" || token.length < 16 || token.length > 128 || !storedHash) return false;
  const presented = Buffer.from(hashOrderAccessToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}
