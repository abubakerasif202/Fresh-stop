// Usage: node --env-file=.env.local --import tsx scripts/stripe-verify-account.ts
// Prints ONLY the Stripe account id and mode (never keys). Exits 1 on a mismatch,
// a mode/account mismatch, or a missing STRIPE_EXPECTED_ACCOUNT. Read-only; creates no payment.
import { assertStripeTestMode, getStripe, getStripeAccountId, verifyStripeAccount } from "../src/lib/stripe";

async function main(): Promise<number> {
  try {
    if (!process.env.STRIPE_EXPECTED_ACCOUNT?.trim()) {
      console.error("STRIPE_EXPECTED_ACCOUNT is required for an explicit account verification.");
      return 1;
    }
    assertStripeTestMode();
    const client = getStripe();
    if (!client) throw new Error("STRIPE_SECRET_KEY is not set.");
    const result = await verifyStripeAccount(client);
    console.log(`account: ${result.accountId}`);
    console.log(`mode: ${result.mode}`);
    if (!getStripeAccountId()) {
      console.error("STRIPE_EXPECTED_ACCOUNT is not set; cannot confirm this is the intended account.");
      return 1;
    }
    console.log(result.ok ? "match: yes" : `match: NO (expected ${result.expectedAccountId})`);
    return result.ok ? 0 : 1;
  } catch (error) {
    console.error(`verification failed: ${error instanceof Error ? error.name : "UnknownError"}`);
    return 1;
  }
}

void main().then((code) => {
  process.exitCode = code;
});
