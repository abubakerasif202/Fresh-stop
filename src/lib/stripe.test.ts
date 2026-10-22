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
  return Promise.resolve().then(run).finally(() => {
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

test("live mode requires production, explicit opt-in and an expected account", async () => {
  const live = { STRIPE_MODE: "live", STRIPE_ALLOW_LIVE: "true", VERCEL_ENV: "production", STRIPE_EXPECTED_ACCOUNT: "acct_verifiedLive" };
  await withEnv(live, () => {
    assertStripeTestMode("sk_live_abc");
    assert.throws(() => assertStripeTestMode("sk_test_abc"), StripeModeError);
  });
  for (const overrides of [{ STRIPE_ALLOW_LIVE: "false" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "development" }, { STRIPE_EXPECTED_ACCOUNT: undefined }, { STRIPE_EXPECTED_ACCOUNT: "acct_1USJ2G7k4A7HyNzJ" }]) {
    await withEnv({ ...live, ...overrides }, () => assert.throws(() => assertStripeTestMode("sk_live_abc"), StripeModeError));
  }
  await withEnv({ ...live, STRIPE_MODE: "test" }, () => assert.throws(() => assertStripeTestMode("sk_live_abc"), StripeModeError));
  await withEnv({ STRIPE_MODE: "invalid" }, () => assert.throws(() => assertStripeTestMode("sk_test_abc"), StripeModeError));
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

test("verified configured live account succeeds and unexpected account fails", async () => {
  await withEnv({ STRIPE_MODE: "live", STRIPE_ALLOW_LIVE: "true", VERCEL_ENV: "production", STRIPE_EXPECTED_ACCOUNT: "acct_verifiedLive", STRIPE_SECRET_KEY: "sk_live_fake" }, async () => {
    for (const id of ["acct_verifiedLive", "acct_unapproved"]) {
      const client = { accounts: { retrieveCurrent: async () => ({ id }) } } as unknown as Pick<Stripe, "accounts">;
      assert.equal((await verifyStripeAccount(client)).ok, id === "acct_verifiedLive");
    }
  });
});

test("explicit test account is checked against the authenticated account", async () => {
  await withEnv({ STRIPE_MODE: "test", STRIPE_EXPECTED_ACCOUNT: "acct_configuredTest", STRIPE_SECRET_KEY: "sk_test_fake" }, async () => {
    const client = { accounts: { retrieveCurrent: async () => ({ id: "acct_other" }) } } as unknown as Pick<Stripe, "accounts">;
    assert.equal((await verifyStripeAccount(client)).ok, false);
  });
});
