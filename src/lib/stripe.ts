import Stripe from "stripe";

/**
 * Pinned to the API version bundled with the installed stripe SDK types
 * (Stripe.LatestApiVersion). Upgrading the SDK is the only way this changes.
 */
export const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-09-30.endive";

const TEST_KEY_PREFIXES = ["sk_test_", "rk_test_"] as const;
const LIVE_KEY_PREFIXES = ["sk_live_", "rk_live_"] as const;
export const AUTHORIZED_STRIPE_ACCOUNT = "acct_1USJ2G7k4A7HyNzJ";

export type StripeEnvironment = Readonly<Record<string, string | undefined>>;

/** Live payments require a deliberate production-only configuration. */
export function isLiveModeAllowed(env: StripeEnvironment = process.env): boolean {
  return env.STRIPE_MODE === "live" && env.STRIPE_ALLOW_LIVE === "true" && env.VERCEL_ENV === "production";
}

export function getStripeMode(env: StripeEnvironment = process.env): "test" | "live" {
  const mode = env.STRIPE_MODE ?? "test";
  if (mode !== "test" && mode !== "live") throw new StripeModeError("Stripe mode configuration is invalid.");
  if (mode === "live" && !isLiveModeAllowed(env)) throw new StripeModeError("Stripe live mode requires explicit production approval.");
  return mode;
}

export class StripeModeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeModeError";
  }
}

/** Enforces the configured environment; retained name for existing callers. Never logs keys. */
export function assertStripeTestMode(key: string | undefined = process.env.STRIPE_SECRET_KEY, env: StripeEnvironment = process.env): void {
  if (!key) throw new StripeModeError("Stripe secret key is not configured.");
  const mode = getStripeMode(env);
  const prefixes = mode === "live" ? LIVE_KEY_PREFIXES : TEST_KEY_PREFIXES;
  if (!prefixes.some((prefix) => key.startsWith(prefix))) throw new StripeModeError("Stripe key does not match the configured payment mode.");
  getStripeAccountId(env);
}

/** True only when a permitted key (test mode, or live with explicit opt-in) is configured. */
export function isStripeConfigured(): boolean {
  try {
    assertStripeTestMode();
    return true;
  } catch {
    return false;
  }
}

let injectedClient: Stripe | null | undefined;

/** Test hook: inject a client (or null to simulate "not configured"); undefined restores the env-based factory. */
export function setStripeClientForTests(client: Stripe | null | undefined): void {
  injectedClient = client;
  cachedClient = undefined;
}

let cachedClient: { key: string; client: Stripe } | undefined;

/**
 * Lazy Stripe client. Returns null when no key is configured; throws StripeModeError
 * for keys or environment settings that violate the explicit mode configuration.
 */
export function getStripe(): Stripe | null {
  if (injectedClient !== undefined) return injectedClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  assertStripeTestMode(key);
  if (cachedClient?.key === key) return cachedClient.client;
  const client = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    appInfo: { name: "Fresh Stop Sydney", version: "0.1.0" }
  });
  cachedClient = { key, client };
  return client;
}

/** Explicit deployment account; sandbox fallback is available only in test mode. */
export function getStripeAccountId(env: StripeEnvironment = process.env): string {
  const mode = getStripeMode(env);
  const value = env.STRIPE_EXPECTED_ACCOUNT?.trim();
  if (value && !/^acct_[A-Za-z0-9]+$/.test(value)) throw new StripeModeError("Stripe account configuration is invalid.");
  if (mode === "live" && (!value || value === AUTHORIZED_STRIPE_ACCOUNT)) throw new StripeModeError("An explicitly verified live Stripe account is required.");
  return value || AUTHORIZED_STRIPE_ACCOUNT;
}

export interface StripeAccountVerification {
  ok: boolean;
  accountId: string;
  expectedAccountId: string | null;
  mode: "test" | "live" | "unknown";
}

/** Retrieves the account behind the client (mockable) and compares it with STRIPE_EXPECTED_ACCOUNT. */
export async function verifyStripeAccount(
  client: Pick<Stripe, "accounts">,
  expected: string | null = getStripeAccountId()
): Promise<StripeAccountVerification> {
  assertStripeTestMode();
  if (expected !== getStripeAccountId()) throw new StripeModeError("Stripe account verification target is not authorised.");
  const account = await client.accounts.retrieveCurrent();
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const mode = TEST_KEY_PREFIXES.some((p) => key.startsWith(p))
    ? "test"
    : LIVE_KEY_PREFIXES.some((p) => key.startsWith(p))
      ? "live"
      : "unknown";
  return {
    ok: account.id === expected && mode === getStripeMode(),
    accountId: account.id,
    expectedAccountId: expected,
    mode
  };
}
