import "./testing/local-db-env";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import { handleCheckoutStatus, handleDeliveryCheck, handleExpireSweep, type PublicHandlerDeps } from "./public-api-handlers";
import { createTestCategory, createTestOrder, createTestProduct, cleanupTestData } from "./testing/db-fixtures";
import { reserveStock } from "./inventory";

after(async () => {
  await db.$disconnect();
});

function handlerDeps(overrides: Partial<PublicHandlerDeps> = {}): PublicHandlerDeps {
  return {
    rateLimit: async () => ({ ok: true, remaining: 10, retryAfterSec: 0 }),
    getGate: async () => ({ enabled: true, reasons: [], codes: [] }),
    checkDelivery: async () => ({ eligible: false, code: "NO_APPROVED_ZONE", message: "none" }),
    ...overrides
  };
}

const statusRequest = (query = "") => new Request(`http://localhost/api/checkout/status${query}`, { headers: { "x-real-ip": "198.51.100.9" } });

test("status reports enabled with no reasons when the gate is open", async () => {
  const res = await handleCheckoutStatus(statusRequest(), handlerDeps());
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), { enabled: true });
});

test("status exposes only generic reasons, never internal codes", async () => {
  const closed = handlerDeps({
    getGate: async () => ({ enabled: false, reasons: ["Online checkout is not available at the moment. Please enquire and we will help."], codes: ["STRIPE_LIVE_KEY_REJECTED", "ENV_DISABLED"] })
  });
  const json = await (await handleCheckoutStatus(statusRequest(), closed)).json();
  assert.equal(json.enabled, false);
  assert.equal(json.reasons.length, 1);
  assert.equal("codes" in json, false);
  assert.doesNotMatch(JSON.stringify(json), /sk_|LIVE|ENV_DISABLED|STRIPE/);
});

test("status fails closed (enabled false) when the gate throws", async () => {
  const json = await (await handleCheckoutStatus(statusRequest(), handlerDeps({ getGate: async () => { throw new Error("db down"); } }))).json();
  assert.equal(json.enabled, false);
  assert.doesNotMatch(JSON.stringify(json), /db down/);
});

test("status passes the requested fulfilment to the gate", async () => {
  const seen: string[] = [];
  const spy = handlerDeps({ getGate: async (f) => { seen.push(f); return { enabled: true, reasons: [], codes: [] }; } });
  await handleCheckoutStatus(statusRequest("?fulfillment=PICKUP"), spy);
  await handleCheckoutStatus(statusRequest(), spy);
  assert.deepEqual(seen, ["PICKUP", "DELIVERY"]);
});

test("status and delivery check are rate limited and fail closed when the limiter is unavailable", async () => {
  const limited = handlerDeps({ rateLimit: async () => ({ ok: false, remaining: 0, retryAfterSec: 9 }) });
  const unavailable = handlerDeps({ rateLimit: async () => ({ ok: false, remaining: 0, retryAfterSec: 30, unavailable: true }) });
  const delivery = () => new Request("http://localhost/api/delivery/check?postcode=2216");
  assert.equal((await handleCheckoutStatus(statusRequest(), limited)).status, 429);
  assert.equal((await handleCheckoutStatus(statusRequest(), unavailable)).status, 503);
  assert.equal((await handleDeliveryCheck(delivery(), limited)).status, 429);
  const blocked = await handleDeliveryCheck(delivery(), unavailable);
  assert.equal(blocked.status, 503);
  assert.equal(blocked.headers.get("retry-after"), "30");
});

test("delivery check reports a database failure as 503, not as ineligible", async () => {
  const down = handlerDeps({ checkDelivery: async () => ({ eligible: false, code: "DB_UNAVAILABLE", message: "later" }) });
  assert.equal((await handleDeliveryCheck(new Request("http://localhost/api/delivery/check?postcode=2216"), down)).status, 503);
  const thrown = handlerDeps({ checkDelivery: async () => { throw new Error("x"); } });
  assert.equal((await handleDeliveryCheck(new Request("http://localhost/api/delivery/check?postcode=2216"), thrown)).status, 503);
});

test("expiry sweep is closed without CRON_SECRET and requires the bearer secret", async () => {
  const req = (auth?: string) => new Request("http://localhost/api/checkout/expire", { headers: auth ? { authorization: auth } : {} });
  assert.equal((await handleExpireSweep(req(), {})).status, 503);
  assert.equal((await handleExpireSweep(req(), { CRON_SECRET: "s3cret-value" })).status, 401);
  assert.equal((await handleExpireSweep(req("Bearer wrong"), { CRON_SECRET: "s3cret-value" })).status, 401);
});

test("an authorised expiry sweep releases lapsed reservations", async () => {
  const category = await createTestCategory(db);
  const product = await createTestProduct(db, category.id, { stockQuantity: 5 });
  const order = await createTestOrder(db);
  const past = new Date(Date.now() - 2 * 60 * 60_000);
  await db.$transaction((tx) => reserveStock(tx, order.id, [{ productId: product.id, quantity: 2 }], 30, past));
  try {
    const res = await handleExpireSweep(new Request("http://localhost/api/checkout/expire", { headers: { authorization: "Bearer s3cret-value" } }), { CRON_SECRET: "s3cret-value" });
    assert.equal(res.status, 200);
    assert.ok((await res.json()).expired >= 1);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: product.id } })).reservedQuantity, 0);
  } finally {
    await cleanupTestData(db, { orderIds: [order.id], productIds: [product.id], categoryIds: [category.id] });
  }
});
