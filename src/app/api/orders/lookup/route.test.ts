import "@/lib/testing/local-db-env";
import test, { after, afterEach, before } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { cleanupTestData, createTestCategory } from "@/lib/testing/db-fixtures";
import { createPendingScenario, type PaymentScenario } from "@/lib/testing/payment-fixtures";
import { POST } from "./route";
import { createOrderTrackingToken } from "@/lib/order-tracking";

const orderIds: string[] = [];
const productIds: string[] = [];
let categoryId = "";
let scenarioOne: PaymentScenario;
let ipCounter = 0;
const savedVercel = process.env.VERCEL;

before(async () => {
  categoryId = (await createTestCategory(db)).id;
  scenarioOne = await createPendingScenario(db, categoryId, {
    orderOverrides: {
      customerPhone: "0499999999",
      customerEmail: "private@example.test",
      deliveryAddress: "99 Secret Street",
      deliverySuburb: "Rockdale",
      fulfillmentType: "DELIVERY",
      stripePaymentIntentId: "pi_secret_ref"
    }
  });
  orderIds.push(scenarioOne.orderId);
  productIds.push(scenarioOne.productId);
});

afterEach(() => {
  resetRateLimits();
  if (savedVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = savedVercel;
});

after(async () => {
  await cleanupTestData(db, { orderIds, productIds, categoryIds: [categoryId] });
  await db.$disconnect();
});

function lookup(body: unknown, ip = `203.0.113.${++ipCounter}`): Promise<Response> {
  return POST(
    new Request("http://localhost/api/orders/lookup", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body)
    })
  );
}

test("valid order number and token returns a minimal, no-store view", async () => {
  const response = await lookup({ orderNumber: scenarioOne.orderNumber.toLowerCase(), token: scenarioOne.accessToken });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const text = JSON.stringify(await response.json());
  const body = JSON.parse(text) as { order: Record<string, unknown> };
  assert.equal(body.order.orderNumber, scenarioOne.orderNumber);
  assert.equal(body.order.paymentState, "PENDING");
  assert.equal(body.order.deliverySuburb, "Rockdale");
  for (const secret of ["0499999999", "private@example.test", "99 Secret Street", "pi_secret_ref", scenarioOne.sessionId, "accessTokenHash", scenarioOne.orderId]) {
    assert.ok(!text.includes(secret), `response must not contain ${secret}`);
  }
});

test("wrong token and unknown order return identical generic 404 responses", async () => {
  const wrong = await lookup({ orderNumber: scenarioOne.orderNumber, token: "x".repeat(32) });
  const unknown = await lookup({ orderNumber: "FS-NOPE-0000", token: scenarioOne.accessToken });
  assert.equal(wrong.status, 404);
  assert.equal(unknown.status, 404);
  assert.equal(await wrong.text(), await unknown.text());
});

test("email tracking credentials recover an order and reject expiry or a different order", async () => {
  const previous = process.env.ORDER_ACCESS_SECRET;
  process.env.ORDER_ACCESS_SECRET = "local-test-only-tracking-secret-32-bytes";
  try {
    const order = await db.order.findUniqueOrThrow({ where: { id: scenarioOne.orderId } });
    const token = createOrderTrackingToken(order);
    assert.equal((await lookup({ orderNumber: order.orderNumber, token })).status, 200);
    assert.equal((await lookup({ orderNumber: "FS-NOPE-0000", token })).status, 404);
    const expired = createOrderTrackingToken(order, Date.now() - 31 * 24 * 60 * 60 * 1000);
    assert.equal((await lookup({ orderNumber: order.orderNumber, token: expired })).status, 404);
  } finally {
    if (previous === undefined) delete process.env.ORDER_ACCESS_SECRET;
    else process.env.ORDER_ACCESS_SECRET = previous;
  }
});

test("missing token or order number is rejected without touching the database result", async () => {
  assert.equal((await lookup({ orderNumber: scenarioOne.orderNumber })).status, 400);
  assert.equal((await lookup({ token: scenarioOne.accessToken })).status, 400);
  assert.equal((await lookup("not json")).status, 400);
});

test("a short or malformed token never matches", async () => {
  assert.equal((await lookup({ orderNumber: scenarioOne.orderNumber, token: "short" })).status, 404);
  assert.equal((await lookup({ orderNumber: scenarioOne.orderNumber, token: scenarioOne.accessToken.slice(1) })).status, 404);
});

test("lookup rejects oversized declared and streamed bodies without parsing", async () => {
  assert.equal((await lookup({ orderNumber: scenarioOne.orderNumber, token: "x".repeat(3000) })).status, 413);
  const response = await POST(new Request("http://localhost/api/orders/lookup", {
    method: "POST", headers: { "content-length": "3000" }, body: "{}"
  }));
  assert.equal(response.status, 413);
});

test("lookups are rate limited per client address", async () => {
  const ip = "198.51.100.77";
  const statuses: number[] = [];
  for (let i = 0; i < 12; i++) {
    statuses.push((await lookup({ orderNumber: scenarioOne.orderNumber, token: "y".repeat(32) }, ip)).status);
  }
  assert.equal(statuses.slice(0, 10).every((s) => s === 404), true);
  assert.deepEqual(statuses.slice(10), [429, 429]);
});

test("lookups fail closed when the shared limiter is unavailable in production", async () => {
  process.env.VERCEL = "1";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const response = await lookup({ orderNumber: scenarioOne.orderNumber, token: scenarioOne.accessToken });
  assert.equal(response.status, 503);
});
