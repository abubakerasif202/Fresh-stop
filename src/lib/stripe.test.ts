import test from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import {
  STRIPE_API_VERSION,
  StripeModeError,
  assertStripeTestMode,
  getStripe,
  getStripeAccountId,
  isStripeConfigured,
  verifyStripeAccount
} from "./stripe";

function withEnv(values: Record<string, string | undefined>, run: () => void | Promise<void>): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    saved[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  return Promise.resolve(run()).finally(() => {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
}

test("test-mode keys are accepted, live keys and junk are refused", async () => {
  await withEnv({ STRIPE_ALLOW_LIVE: undefined }, () => {
    assertStripeTestMode("sk_test_abc");
    assertStripeTestMode("rk_test_abc");
    assert.throws(() => assertStripeTestMode("sk_live_abc"), StripeModeError);
    assert.throws(() => assertStripeTestMode("rk_live_abc"), StripeModeError);
    assert.throws(() => assertStripeTestMode("whsec_abc"), StripeModeError);
    assert.throws(() => assertStripeTestMode(undefined), StripeModeError);
  });
});

test("refusal messages never contain the key", async () => {
  await withEnv({ STRIPE_ALLOW_LIVE: undefined }, () => {
    assert.throws(
      () => assertStripeTestMode("sk_live_SECRETVALUE"),
      (error: Error) => !error.message.includes("SECRETVALUE")
    );
  });
});

test("live keys are only permitted with the explicit STRIPE_ALLOW_LIVE opt-in", async () => {
  await withEnv({ STRIPE_ALLOW_LIVE: "true" }, () => assertStripeTestMode("sk_live_abc"));
  await withEnv({ STRIPE_ALLOW_LIVE: "1" }, () => {
    assert.throws(() => assertStripeTestMode("sk_live_abc"), StripeModeError);
  });
});

test("isStripeConfigured and getStripe fail closed", async () => {
  await withEnv({ STRIPE_SECRET_KEY: undefined, STRIPE_ALLOW_LIVE: undefined }, () => {
    assert.equal(isStripeConfigured(), false);
    assert.equal(getStripe(), null);
  });
  await withEnv({ STRIPE_SECRET_KEY: "sk_live_abc", STRIPE_ALLOW_LIVE: undefined }, () => {
    assert.equal(isStripeConfigured(), false);
    assert.throws(() => getStripe(), StripeModeError);
  });
  await withEnv({ STRIPE_SECRET_KEY: "sk_test_abc" }, () => {
    assert.equal(isStripeConfigured(), true);
    assert.equal(getStripe(), getStripe(), "client is cached per key");
  });
});

test("API version is pinned to the SDK's bundled version", () => {
  assert.match(STRIPE_API_VERSION, /^\d{4}-\d{2}-\d{2}\./);
});

test("verifyStripeAccount compares the retrieved account id with the expected one", async () => {
  const client: Pick<Stripe, "accounts"> = {
    accounts: { retrieveCurrent: async () => ({ id: "acct_1USJ2G7k4A7HyNzJ" }) }
  } as Pick<Stripe, "accounts">;
  await withEnv({ STRIPE_SECRET_KEY: "sk_test_abc", STRIPE_EXPECTED_ACCOUNT: "acct_1USJ2G7k4A7HyNzJ" }, async () => {
    assert.equal(getStripeAccountId(), "acct_1USJ2G7k4A7HyNzJ");
    const ok = await verifyStripeAccount(client);
    assert.deepEqual(ok, { ok: true, accountId: "acct_1USJ2G7k4A7HyNzJ", expectedAccountId: "acct_1USJ2G7k4A7HyNzJ", mode: "test" });
    await assert.rejects(() => verifyStripeAccount(client, "acct_other"), StripeModeError);
    await assert.rejects(() => verifyStripeAccount(client, null), StripeModeError);
  });
});
