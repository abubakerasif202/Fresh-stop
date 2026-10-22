import "@/lib/testing/local-db-env";
import test, { after, afterEach, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { setEmailTransportForTests } from "@/lib/email";
import { STRIPE_API_VERSION, setStripeClientForTests } from "@/lib/stripe";
import { cleanupTestData, createTestCategory } from "@/lib/testing/db-fixtures";
import { createPendingScenario, sessionEvent, type PaymentScenario } from "@/lib/testing/payment-fixtures";
import { POST } from "./route";

const SECRET = "whsec_test_route_secret";
const stripe = new Stripe("sk_test_route_dummy", { apiVersion: STRIPE_API_VERSION });
const orderIds: string[] = [];
const productIds: string[] = [];
const eventIds: string[] = [];
let categoryId = "";
const savedSecret = process.env.STRIPE_WEBHOOK_SECRET;
const savedKey = process.env.STRIPE_SECRET_KEY;
const savedMode = process.env.STRIPE_MODE;

before(async () => {
  categoryId = (await createTestCategory(db)).id;
});

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.STRIPE_MODE = "test";
  stripe.accounts.retrieveCurrent = (async () => ({ id: "acct_1USJ2G7k4A7HyNzJ" })) as typeof stripe.accounts.retrieveCurrent;
  process.env.STRIPE_SECRET_KEY = "sk_test_route_dummy";
  setStripeClientForTests(stripe);
  setEmailTransportForTests(async () => undefined);
});

afterEach(() => {
  setStripeClientForTests(undefined);
  setEmailTransportForTests(null);
  if (savedSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = savedSecret;
  if (savedKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = savedKey;
  if (savedMode === undefined) delete process.env.STRIPE_MODE;
  else process.env.STRIPE_MODE = savedMode;
});

after(async () => {
  await db.adminAuditLog.deleteMany({ where: { entityId: { in: orderIds } } });
  await db.paymentEvent.deleteMany({ where: { stripeEventId: { in: eventIds } } });
  await cleanupTestData(db, { orderIds, productIds, categoryIds: [categoryId] });
  await db.$disconnect();
});

async function scenario(): Promise<PaymentScenario> {
  const s = await createPendingScenario(db, categoryId);
  orderIds.push(s.orderId);
  productIds.push(s.productId);
  return s;
}

function signedRequest(payload: string, secret = SECRET): Request {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body: payload
  });
}

test("returns 503 when the webhook secret is missing", async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  const response = await POST(signedRequest("{}"));
  assert.equal(response.status, 503);
});

test("returns 503 when Stripe is not configured", async () => {
  setStripeClientForTests(null);
  const response = await POST(signedRequest("{}"));
  assert.equal(response.status, 503);
});

test("rejects a missing signature header with a generic 400", async () => {
  const response = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid webhook request." });
});

test("rejects an invalid signature with a generic 400 that does not echo the error", async () => {
  const s = await scenario();
  const payload = JSON.stringify(sessionEvent(s));
  const response = await POST(signedRequest(payload, "whsec_wrong_secret"));
  assert.equal(response.status, 400);
  const text = JSON.stringify(await response.json());
  assert.equal(text, JSON.stringify({ error: "Invalid webhook request." }));
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: s.orderId } })).paymentStatus, "PENDING");
});

test("rejects a body altered after signing", async () => {
  const s = await scenario();
  const payload = JSON.stringify(sessionEvent(s));
  const request = new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) },
    body: payload.replace('"paid"', '"unpaid"')
  });
  assert.equal((await POST(request)).status, 400);
});

test("a validly signed paid event marks the order PAID and a replay is a duplicate", async () => {
  const s = await scenario();
  const event = sessionEvent(s);
  eventIds.push(event.id);
  const payload = JSON.stringify(event);

  const first = await POST(signedRequest(payload));
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { received: true });
  assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: s.orderId } })).paymentStatus, "PAID");

  const replay = await POST(signedRequest(payload));
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { received: true, duplicate: true });
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: s.productId } })).stockQuantity, 10 - s.quantity);
});

test("a processing failure answers 500 with a generic body so Stripe retries", async () => {
  const s = await scenario();
  await db.order.update({ where: { id: s.orderId }, data: { stripeSessionId: null } });
  const event = sessionEvent(s);
  eventIds.push(event.id);
  const response = await POST(signedRequest(JSON.stringify(event)));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Webhook processing failed." });
  const row = await db.paymentEvent.findUniqueOrThrow({ where: { stripeEventId: event.id } });
  assert.equal(row.status, "FAILED");
});

test("a correctly signed event is refused when the configured key belongs to another account", async () => {
  stripe.accounts.retrieveCurrent = (async () => ({ id: "acct_unapproved" })) as typeof stripe.accounts.retrieveCurrent;
  const s = await scenario();
  const response = await POST(signedRequest(JSON.stringify(sessionEvent(s))));
  assert.equal(response.status, 503);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: s.orderId } })).paymentStatus, "PENDING");
});

test("a correctly signed live event cannot change a test order", async () => {
  const s = await scenario();
  const response = await POST(signedRequest(JSON.stringify(sessionEvent(s, { livemode: true }))));
  assert.equal(response.status, 400);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: s.orderId } })).paymentStatus, "PENDING");
});

test("a correctly signed connected-account event cannot change this account's order", async () => {
  const s = await scenario();
  const response = await POST(signedRequest(JSON.stringify(sessionEvent(s, { account: "acct_other" }))));
  assert.equal(response.status, 400);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: s.orderId } })).paymentStatus, "PENDING");
});

test("live-configured signed webhooks accept only live events with the live signing secret", async () => {
  const keys = ["STRIPE_ALLOW_LIVE", "VERCEL_ENV", "STRIPE_EXPECTED_ACCOUNT"] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_ALLOW_LIVE = "true";
    process.env.VERCEL_ENV = "production";
    process.env.STRIPE_EXPECTED_ACCOUNT = "acct_verifiedLiveFixture";
    // Dummy credentials and locally generated signatures only: no network or charge.
    process.env.STRIPE_SECRET_KEY = "sk_live_route_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_route_fixture";
    stripe.accounts.retrieveCurrent = (async () => ({ id: "acct_verifiedLiveFixture" })) as typeof stripe.accounts.retrieveCurrent;
    const s = await scenario();
    const testPayload = JSON.stringify(sessionEvent(s));
    assert.equal((await POST(signedRequest(testPayload, "whsec_live_route_fixture"))).status, 400);
    const event = sessionEvent(s, { livemode: true });
    eventIds.push(event.id);
    const payload = JSON.stringify(event);
    assert.equal((await POST(signedRequest(payload))).status, 400);
    assert.equal((await POST(signedRequest(payload, "whsec_live_route_fixture"))).status, 200);
    assert.equal((await db.order.findUniqueOrThrow({ where: { id: s.orderId } })).paymentStatus, "PAID");
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
