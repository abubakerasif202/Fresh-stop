import test from "node:test";
import assert from "node:assert/strict";
import { classifyStripeKey, getPaidCheckoutStatus, type GateClient } from "./commerce-gate";

const TEST_KEY = "sk_test_fakefakefakefake";
const ON = { PAID_CHECKOUT_ENABLED: "true", STRIPE_SECRET_KEY: TEST_KEY } as const;

interface FakeOptions {
  flag?: string | null;
  zones?: number;
  flagError?: boolean;
  zoneError?: boolean;
}

function fakeClient(options: FakeOptions = {}): { client: GateClient; calls: string[] } {
  const calls: string[] = [];
  const client = {
    deliverySetting: {
      findUnique: async () => {
        calls.push("setting");
        if (options.flagError) throw new Error("db down");
        return options.flag === null || options.flag === undefined ? null : { id: "1", key: "paidCheckoutApproved", value: options.flag, updatedAt: new Date() };
      }
    },
    deliveryZone: {
      count: async () => {
        calls.push("zones");
        if (options.zoneError) throw new Error("db down");
        return options.zones ?? 0;
      }
    }
  } as unknown as GateClient;
  return { client, calls };
}

test("enabled only when env, DB flag, test key and an approved zone all agree", async () => {
  const { client } = fakeClient({ flag: "true", zones: 1 });
  const status = await getPaidCheckoutStatus({ client, env: ON });
  assert.equal(status.enabled, true);
  assert.deepEqual(status.reasons, []);
  assert.deepEqual(status.codes, []);
});

test("env flag off: disabled and the database is never touched", async () => {
  const { client, calls } = fakeClient({ flag: "true", zones: 1 });
  for (const value of [undefined, "false", "1", "TRUE", ""]) {
    const status = await getPaidCheckoutStatus({ client, env: { ...ON, PAID_CHECKOUT_ENABLED: value } });
    assert.equal(status.enabled, false);
    assert.ok(status.codes.includes("ENV_DISABLED"));
  }
  assert.deepEqual(calls, []);
});

test("presentation mode refuses paid checkout even when every payment gate is approved", async () => {
  const { client, calls } = fakeClient({ flag: "true", zones: 1 });
  const status = await getPaidCheckoutStatus({ client, env: { ...ON, NEXT_PUBLIC_STOREFRONT_DEMO: "true" } });
  assert.equal(status.enabled, false);
  assert.deepEqual(status.codes, ["DEMO_MODE"]);
  assert.deepEqual(calls, []);
});

test("DB flag off or missing: disabled even when the environment is on", async () => {
  for (const flag of [null, "false", "", "yes"]) {
    const { client } = fakeClient({ flag, zones: 1 });
    const status = await getPaidCheckoutStatus({ client, env: ON });
    assert.equal(status.enabled, false);
    assert.deepEqual(status.codes, ["DB_FLAG_OFF"]);
  }
});

test("live Stripe keys are rejected outright, with no database access", async () => {
  const { client, calls } = fakeClient({ flag: "true", zones: 1 });
  for (const key of ["sk_live_fakefakefakefake", "rk_live_fakefakefakefake"]) {
    const status = await getPaidCheckoutStatus({ client, env: { ...ON, STRIPE_SECRET_KEY: key } });
    assert.equal(status.enabled, false);
    assert.deepEqual(status.codes, ["STRIPE_LIVE_KEY_REJECTED"]);
  }
  assert.deepEqual(calls, []);
});

test("missing or unrecognised Stripe keys are rejected; restricted test keys are allowed", async () => {
  assert.equal(classifyStripeKey(undefined), "STRIPE_KEY_MISSING");
  assert.equal(classifyStripeKey(""), "STRIPE_KEY_MISSING");
  assert.equal(classifyStripeKey("pk_test_abc"), "STRIPE_KEY_INVALID");
  assert.equal(classifyStripeKey("whsec_abc"), "STRIPE_KEY_INVALID");
  assert.equal(classifyStripeKey("sk_test_abc"), null);
  assert.equal(classifyStripeKey("rk_test_abc"), null);
  const { client } = fakeClient({ flag: "true", zones: 1 });
  const status = await getPaidCheckoutStatus({ client, env: { PAID_CHECKOUT_ENABLED: "true" } });
  assert.deepEqual(status.codes, ["STRIPE_KEY_MISSING"]);
});

test("delivery needs an approved zone; pickup does not", async () => {
  const { client } = fakeClient({ flag: "true", zones: 0 });
  const delivery = await getPaidCheckoutStatus({ client, env: ON, fulfillment: "DELIVERY" });
  assert.equal(delivery.enabled, false);
  assert.deepEqual(delivery.codes, ["NO_APPROVED_ZONE"]);
  const defaulted = await getPaidCheckoutStatus({ client, env: ON });
  assert.equal(defaulted.enabled, false);
  const pickup = await getPaidCheckoutStatus({ client, env: ON, fulfillment: "PICKUP" });
  assert.equal(pickup.enabled, true);
});

test("any database error fails closed", async () => {
  for (const options of [{ flagError: true }, { flag: "true", zoneError: true }] as FakeOptions[]) {
    const { client } = fakeClient(options);
    const status = await getPaidCheckoutStatus({ client, env: ON });
    assert.equal(status.enabled, false);
    assert.deepEqual(status.codes, ["DB_ERROR"]);
  }
});

test("reasons are generic: no keys, env names, vendors or internals", async () => {
  const scenarios: Array<Parameters<typeof getPaidCheckoutStatus>[0]> = [
    { env: {}, client: fakeClient().client },
    { env: { ...ON, STRIPE_SECRET_KEY: "sk_live_fakefakefakefake" }, client: fakeClient().client },
    { env: ON, client: fakeClient({ flag: null }).client },
    { env: ON, client: fakeClient({ flag: "true", zones: 0 }).client },
    { env: ON, client: fakeClient({ flagError: true }).client }
  ];
  for (const scenario of scenarios) {
    const status = await getPaidCheckoutStatus(scenario);
    assert.equal(status.enabled, false);
    assert.ok(status.reasons.length > 0);
    for (const reason of status.reasons) {
      assert.doesNotMatch(reason, /sk_|rk_|stripe|PAID_CHECKOUT|database|\bDB\b|\benv|\bkey|\blive\b|\btest\b/i);
    }
  }
});
