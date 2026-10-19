import { createHmac, timingSafeEqual } from "node:crypto";

/** Sandbox-only. Production remains enquiry-only until a separate approved release. */
export const SANDBOX_ACCOUNT_ID = "acct_1USJ2G7k4A7HyNzJ";

export function stripeSandboxEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.STRIPE_SANDBOX_ENABLED === "true" &&
    env.VERCEL_ENV !== "production" &&
    (env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") &&
    env.CATALOGUE_DATA_SOURCE !== "reviewed-snapshot";
}

function secretKey(): string {
  if (!stripeSandboxEnabled()) throw new Error("Stripe sandbox is disabled.");
  if (process.env.STRIPE_TEST_ACCOUNT_ID !== SANDBOX_ACCOUNT_ID) throw new Error("Stripe sandbox account mismatch.");
  const key = process.env.STRIPE_TEST_SECRET_KEY;
  if (!key || !key.startsWith("sk_test_")) throw new Error("Stripe test secret key is not configured.");
  return key;
}

export type StripeObject = Record<string, unknown>;

export async function stripeApi(
  method: "GET" | "POST",
  path: string,
  fields?: URLSearchParams,
  idempotencyKey?: string
): Promise<StripeObject> {
  if (!/^\/[a-z0-9/_-]+$/.test(path)) throw new Error("Invalid Stripe API path.");
  const key = secretKey();
  const response = await fetch("https://api.stripe.com/v1" + path, {
    method,
    headers: {
      Authorization: "Bearer " + key,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: method === "POST" ? fields?.toString() ?? "" : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Stripe request failed (" + response.status + ").");
  const json: unknown = await response.json();
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("Invalid Stripe response.");
  return json as StripeObject;
}

/** Verify the actual test account behind the secret, not only the sk_test prefix. */
export async function verifySandboxAccount(): Promise<void> {
  const account = await stripeApi("GET", "/account");
  if (account.id !== SANDBOX_ACCOUNT_ID) throw new Error("Stripe test key belongs to the wrong account.");
}

/** Pure signature verification for raw request bodies. */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header || !secret.startsWith("whsec_")) return false;
  const parts = header.split(",").map(p => p.trim().split("="));
  const stamp = parts.find(p => p[0] === "t")?.[1];
  const candidates = parts.filter(p => p[0] === "v1").map(p => p[1]);
  if (!stamp || !/^[0-9]+$/.test(stamp) || candidates.length === 0) return false;
  const timestamp = Number(stamp);
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(now / 1000) - timestamp) > 300) return false;
  const digest = createHmac("sha256", secret).update(stamp + "." + payload).digest();
  return candidates.some(hex => {
    if (!/^[a-f0-9]{64}$/i.test(hex)) return false;
    const incoming = Buffer.from(hex, "hex");
    return incoming.length === digest.length && timingSafeEqual(digest, incoming);
  });
}

export function addField(fields: URLSearchParams, name: string, value: string | number | boolean): void {
  fields.append(name, String(value));
}
