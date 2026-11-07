import "./testing/local-db-env";
import test, { after, before, mock } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { db } from "./db";
import { getPaidCheckoutStatus, type PaidCheckoutStatus } from "./commerce-gate";
import { handleCheckout, type CheckoutDeps } from "./checkout-service";
import { generateOrderNumber, isUniqueViolation, persistOrder } from "./checkout-persist";
import { validateCheckoutBody } from "./checkout-input";
import { validateAndPriceOrder } from "./order-pricing";
import { StockConflictError } from "./inventory";
import type { StripeLike, StripeSessionLike } from "./checkout-stripe";
import { verifyOrderAccessToken } from "./order-access";
import { cleanupTestData, createTestCategory, createTestProduct, createTestZone, testPostcode, uniqueId } from "./testing/db-fixtures";

const EMAIL_DOMAIN = "@checkout-test.invalid";
const ENABLED: PaidCheckoutStatus = { enabled: true, reasons: [], codes: [] };
const productIds: string[] = [];
const zoneIds: string[] = [];
let categoryId = "";
let postcode = "";
let pickupBranchSlug = "";

before(async () => {
  categoryId = (await createTestCategory(db)).id;
  postcode = testPostcode();
  pickupBranchSlug = uniqueId("pickup");
  await db.storeBranch.create({ data: {
    name: "Test pickup", slug: pickupBranchSlug, address: "Test address", suburb: "Test suburb", postcode: "8000",
    phone: "0412345678", email: "test@example.invalid", googleMapsUrl: "", openingHours: "Test only"
  } });
  zoneIds.push((await createTestZone(db, postcode, { deliveryFeeCents: 700, freeDeliveryMinCents: 100_000 })).id);
});

after(async () => {
  const orders = await db.order.findMany({ where: { customerEmail: { endsWith: EMAIL_DOMAIN } }, select: { id: true } });
  await cleanupTestData(db, { orderIds: orders.map((o) => o.id), productIds, categoryIds: [categoryId], zoneIds });
  await db.customer.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
  await db.storeBranch.deleteMany({ where: { slug: pickupBranchSlug } });
  await db.$disconnect();
});

interface StripeCalls {
  creates: Array<{ params: Record<string, unknown>; options?: { idempotencyKey?: string } }>;
}

function fakeStripe(options: { failCreate?: boolean } = {}): { stripe: StripeLike; calls: StripeCalls } {
  const calls: StripeCalls = { creates: [] };
  const sessions = new Map<string, StripeSessionLike>();
  const stripe: StripeLike = {
    checkout: {
      sessions: {
        create: async (params, opts) => {
          calls.creates.push({ params: params as unknown as Record<string, unknown>, options: opts as { idempotencyKey?: string } });
          if (options.failCreate) throw Object.assign(new Error("Stripe said no for jane@checkout-test.invalid"), { code: "card_declined", type: "StripeCardError" });
          const key = opts?.idempotencyKey ?? uniqueId("k");
          const existing = [...sessions.values()].find((s) => s.id === `cs_test_${key}`);
          const session = existing ?? {
            id: `cs_test_${key}`, url: `https://checkout.stripe.test/${key}`, status: "open",
            client_reference_id: params.client_reference_id, metadata: params.metadata as Record<string, string>, mode: params.mode,
            currency: "aud", amount_total: params.line_items?.reduce((sum, line) => sum + (line.quantity ?? 1) * (line.price_data?.unit_amount ?? 0), 0)
          };
          sessions.set(session.id, session);
          return session;
        },
        listRecent: async () => ({ sessions: [...sessions.values()], complete: true }),
        retrieve: async (id) => {
          const session = sessions.get(id);
          if (!session) throw new Error("no such session");
          return session;
        },
        expire: async (id) => {
          const session = sessions.get(id);
          if (session) session.status = "expired";
          return session;
        }
      }
    }
  };
  return { stripe, calls };
}

function deps(overrides: Partial<CheckoutDeps> & { stripe?: StripeLike | null } = {}): CheckoutDeps {
  const { stripe, ...rest } = overrides;
  return {
    db,
    getStripe: () => (stripe === undefined ? fakeStripe().stripe : stripe),
    getGate: async () => ENABLED,
    rateLimit: async () => ({ ok: true, remaining: 5, retryAfterSec: 0 }),
    now: () => new Date(),
    siteBase: () => "http://localhost:3000",
    ...rest
  };
}

async function product(overrides: Record<string, unknown> = {}) {
  const created = await createTestProduct(db, categoryId, overrides);
  productIds.push(created.id);
  return created;
}

function customer(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jane Citizen",
    email: `${uniqueId("jane")}${EMAIL_DOMAIN}`,
    phone: "0412 345 678",
    address: "1 Test Street",
    suburb: "Rockdale",
    postcode,
    notes: "Leave at the gate",
    ...overrides
  };
}

function body(items: unknown, extra: Record<string, unknown> = {}) {
  return { items, customer: customer(), fulfillmentType: "DELIVERY", idempotencyKey: uniqueId("request"), ...extra };
}

function request(payload: unknown, raw = false) {
  return new Request("http://localhost/api/checkout/stripe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "198.51.100.7" },
    body: raw ? String(payload) : JSON.stringify(payload)
  });
}

const orderCount = () => db.order.count({ where: { customerEmail: { endsWith: EMAIL_DOMAIN } } });

const throwingDb = new Proxy({}, { get() { throw new Error("database must not be touched"); } }) as unknown as PrismaClient;

test("backorders require literal customer acknowledgement before any order or Stripe session", async () => {
  const p = await product({ availabilityStatus: "BACKORDER", stockQuantity: null, stockVerified: false });
  const { stripe, calls } = fakeStripe();
  const beforeCount = await orderCount();
  for (const acknowledgement of [undefined, false, "true", 1]) {
    const payload = body([{ productId: p.id, quantity: 1 }], { backorderAcknowledged: acknowledgement });
    const response = await handleCheckout(request(payload), deps({ stripe }));
    assert.equal(response.status, 400);
    const result = await response.json();
    assert.match(result.details.backorderAcknowledged, /sourced after purchase/);
    assert.ok(result.details.backorderAcknowledged.includes(p.name));
  }
  assert.equal(await orderCount(), beforeCount);
  assert.equal(calls.creates.length, 0);
  const response = await handleCheckout(request(body([{ productId: p.id, quantity: 1 }], { backorderAcknowledged: true })), deps({ stripe }));
  assert.equal(response.status, 200);
  assert.equal(calls.creates.length, 1);
  const reservation = await db.inventoryReservation.findFirstOrThrow({ where: { productId: p.id } });
  assert.equal(reservation.isBackorder, true);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stockQuantity, null);
});

test("guest checkout preserves existing customer identity while recording order contact details", async () => {
  const p = await product();
  const contact = customer();
  const existing = await db.customer.create({ data: { email: contact.email, name: "Original customer", phone: "0400000000" } });
  const response = await handleCheckout(request(body([{ productId: p.id, quantity: 1 }], { customer: contact })), deps());
  assert.equal(response.status, 200);
  const saved = await db.customer.findUniqueOrThrow({ where: { id: existing.id } });
  assert.equal(saved.name, "Original customer");
  assert.equal(saved.phone, "0400000000");
  const order = await db.order.findFirstOrThrow({ where: { customerEmail: contact.email } });
  assert.equal(order.customerName, contact.name);
  assert.equal(order.customerPhone, "0412345678");
});

test("persistence rejects a newly backordered line despite a prior acknowledgement", async () => {
  const p = await product();
  const parsed = validateCheckoutBody(body([{ productId: p.id, quantity: 1 }], { backorderAcknowledged: true }));
  assert.ok(parsed.ok);
  const priced = await validateAndPriceOrder(parsed.value.items, postcode, "DELIVERY", db);
  assert.ok(priced.ok);
  await db.product.update({ where: { id: p.id }, data: { availabilityStatus: "BACKORDER" } });
  await assert.rejects(persistOrder(db, parsed.value, priced, "test-backorder-race-hash", new Date()),
    (error: unknown) => error instanceof StockConflictError && error.conflicts.some((conflict) => conflict.reason === "BACKORDER_ACK_REQUIRED"));
  assert.equal(await db.order.count({ where: { idempotencyKey: parsed.value.idempotencyKey } }), 0);
  assert.equal(await db.customer.count({ where: { email: parsed.value.customer.email } }), 0);
  assert.equal(await db.inventoryReservation.count({ where: { productId: p.id } }), 0);
});

test("gate off (env): 503 CHECKOUT_DISABLED, no Stripe call and the database is never touched", async () => {
  const { stripe, calls } = fakeStripe();
  const res = await handleCheckout(
    request(body([{ slug: "anything", quantity: 1 }])),
    deps({ db: throwingDb, stripe, getGate: (fulfillment) => getPaidCheckoutStatus({ fulfillment, env: {}, client: throwingDb }) })
  );
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, "CHECKOUT_DISABLED");
  assert.equal(calls.creates.length, 0);
});

test("gate off (DB flag): 503 CHECKOUT_DISABLED and no order, customer or reservation rows are written", async () => {
  const p = await product();
  const before = await orderCount();
  const gate = getPaidCheckoutStatus({
    env: { PAID_CHECKOUT_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test_fakefakefake" },
    client: { deliverySetting: { findUnique: async () => null }, deliveryZone: { count: async () => 1 } } as unknown as PrismaClient
  });
  const res = await handleCheckout(request(body([{ productId: p.id, quantity: 1 }])), deps({ getGate: () => gate }));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, "CHECKOUT_DISABLED");
  assert.equal(await orderCount(), before);
  assert.equal(await db.inventoryReservation.count({ where: { productId: p.id } }), 0);
});

test("gate read failure fails closed as DB_UNAVAILABLE; a bad Stripe key is STRIPE_NOT_CONFIGURED", async () => {
  const dbError: PaidCheckoutStatus = { enabled: false, reasons: ["x"], codes: ["DB_ERROR"] };
  const down = await handleCheckout(request(body([])), deps({ getGate: async () => dbError }));
  assert.equal(down.status, 503);
  assert.equal((await down.json()).code, "DB_UNAVAILABLE");

  const thrown = await handleCheckout(request(body([])), deps({ getGate: async () => { throw new Error("boom"); } }));
  assert.equal(thrown.status, 503);

  const liveKey: PaidCheckoutStatus = { enabled: false, reasons: ["x"], codes: ["STRIPE_LIVE_KEY_REJECTED"] };
  const key = await handleCheckout(request(body([])), deps({ getGate: async () => liveKey }));
  assert.equal(key.status, 503);
  assert.equal((await key.json()).code, "STRIPE_NOT_CONFIGURED");
});

test("an enabled gate with no Stripe client still refuses before writing anything", async () => {
  const p = await product();
  const before = await orderCount();
  const res = await handleCheckout(request(body([{ productId: p.id, quantity: 1 }])), deps({ stripe: null }));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, "STRIPE_NOT_CONFIGURED");
  assert.equal(await orderCount(), before);
});

test("invalid input is a 400 with field details and writes nothing", async () => {
  const p = await product();
  const before = await orderCount();
  const items = [{ productId: p.id, quantity: 1 }];
  const bad: Array<[string, unknown]> = [
    ["email", { ...body(items), customer: customer({ email: "not-an-email" }) }],
    ["phone", { ...body(items), customer: customer({ phone: "12345" }) }],
    ["postcode", { ...body(items), customer: customer({ postcode: "21A6" }) }],
    ["name", { ...body(items), customer: customer({ name: "J" }) }],
    ["fulfillmentType", { ...body(items), fulfillmentType: "DRONE" }],
    ["items", { ...body([]) }],
    ["items.0.quantity", body([{ productId: p.id, quantity: 0 }])],
    ["items.0.quantity", body([{ productId: p.id, quantity: 1.5 }])],
    ["items.0.quantity", body([{ productId: p.id, quantity: "2" }])],
    ["idempotencyKey", body(items, { idempotencyKey: "short" })],
    ["idempotencyKey", body(items, { idempotencyKey: null })],
    ["idempotencyKey", body(items, { idempotencyKey: undefined })],
    ["notes", { ...body(items), customer: customer({ notes: "x".repeat(501) }) }]
  ];
  for (const [field, payload] of bad) {
    const res = await handleCheckout(request(payload), deps());
    assert.equal(res.status, 400, field);
    const json = await res.json();
    assert.equal(json.code, "VALIDATION");
    assert.ok(field in json.details, `${field} in ${Object.keys(json.details)}`);
  }
  for (const raw of ["{not json", "[]", "null", "42"]) {
    assert.equal((await handleCheckout(request(raw, true), deps())).status, 400);
  }
  assert.equal(await orderCount(), before);
});

test("oversized bodies are rejected with 413", async () => {
  const res = await handleCheckout(request(body([{ slug: "x", quantity: 1 }], { pad: "x".repeat(40_000) })), deps());
  assert.equal(res.status, 413);
});

test("happy path: order, items and reservation are created atomically and Stripe gets server-computed amounts", async () => {
  const taxable = await product({ priceCents: 1050, taxCategory: "TAXABLE_10", stockQuantity: 10 });
  const free = await product({ priceCents: 480, stockQuantity: 10 });
  const { stripe, calls } = fakeStripe();
  const payload = body([
    { productId: taxable.id, quantity: 2, price: 0.01, priceCents: 1, name: "Free stuff" },
    { slug: free.slug, quantity: 3 }
  ]);
  const res = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const json = await res.json();
  assert.match(json.orderNumber, /^FS-\d{6}-[A-Z2-9]{6}$/);
  assert.ok(json.url.startsWith("https://"));
  assert.ok(json.accessToken.length >= 16);

  const order = await db.order.findUniqueOrThrow({ where: { id: json.orderId }, include: { orderItems: true, reservations: true } });
  assert.equal(order.paymentStatus, "PENDING");
  assert.equal(order.orderStatus, "PENDING_PAYMENT");
  assert.equal(order.currency, "aud");
  assert.equal(order.stripeSessionId, json.sessionId);
  assert.equal(order.subtotal, 35.4);
  assert.equal(order.totalCents, 2100 + 1440 + 700);
  assert.equal(order.gstTotal, Number((Math.floor((2 * 2100 + 11) / 22) / 100).toFixed(2)));
  assert.equal(verifyOrderAccessToken(json.accessToken, order.accessTokenHash), true);
  assert.equal(verifyOrderAccessToken("x".repeat(32), order.accessTokenHash), false);
  assert.equal(order.reservations.length, 2);
  assert.ok(order.reservations.every((r) => r.status === "ACTIVE"));
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: taxable.id } })).reservedQuantity, 2);

  assert.equal(calls.creates.length, 1);
  const { params, options } = calls.creates[0];
  assert.equal(options?.idempotencyKey, `fs-checkout-${order.id}`);
  assert.equal(params.mode, "payment");
  assert.equal(params.ui_mode, "hosted_page");
  assert.equal(params.billing_address_collection, "auto");
  assert.deepEqual(params.automatic_tax, { enabled: false });
  assert.deepEqual(params.phone_number_collection, { enabled: false });
  assert.equal(params.allow_promotion_codes, false);
  assert.equal(params.payment_method_collection, undefined);
  assert.deepEqual(params.payment_intent_data, { metadata: { orderId: order.id, orderNumber: order.orderNumber } });
  assert.equal(params.customer_email, payload.customer.email);
  assert.equal(params.client_reference_id, order.id);
  assert.deepEqual(params.metadata, { orderId: order.id, orderNumber: order.orderNumber });
  const lines = params.line_items as Array<{ price_data: { currency: string; unit_amount: number; product_data: { images?: string[] } }; quantity: number }>;
  assert.deepEqual(lines.map((l) => [l.price_data.unit_amount, l.quantity]), [[1050, 2], [480, 3], [700, 1]]);
  assert.ok(lines.every((l) => l.price_data.currency === "aud"));
  assert.ok(lines.every((l) => l.price_data.product_data.images === undefined), "relative images over http are omitted");
  const total = lines.reduce((sum, l) => sum + l.price_data.unit_amount * l.quantity, 0);
  assert.equal(total, order.totalCents);
  assert.ok((params.expires_at as number) - Math.floor(Date.now() / 1000) >= 30 * 60, "Stripe needs at least 30 minutes");
  const success = String(params.success_url);
  assert.ok(success.includes(`/order-confirmation/${order.orderNumber}`));
  assert.ok(success.includes(`t=${encodeURIComponent(json.accessToken)}`));
  assert.ok(String(params.cancel_url).includes("/checkout"));
  const serialised = JSON.stringify(params.metadata);
  assert.doesNotMatch(serialised, /jane|0412|Rockdale|Test Street|checkout-test/i, "no customer PII in metadata");
});

test("product images are sent only as absolute https URLs", async () => {
  const p = await product({ imageUrl: "/products/ai/x.webp" });
  const secure = fakeStripe();
  await handleCheckout(request(body([{ productId: p.id, quantity: 1 }])), deps({ stripe: secure.stripe, siteBase: () => "https://shop.example.test" }));
  const lines = secure.calls.creates[0].params.line_items as Array<{ price_data: { product_data: { images?: string[] } } }>;
  assert.deepEqual(lines[0].price_data.product_data.images, ["https://shop.example.test/products/ai/x.webp"]);
});

test("pickup orders carry no delivery fee and need no delivery postcode", async () => {
  const p = await product({ priceCents: 300 });
  const { stripe, calls } = fakeStripe();
  const payload = { idempotencyKey: uniqueId("pickup"), items: [{ productId: p.id, quantity: 1 }], fulfillmentType: "PICKUP", pickupBranchSlug, customer: customer({ address: "", suburb: "", postcode: "" }) };
  const res = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(res.status, 200);
  const lines = calls.creates[0].params.line_items as unknown[];
  assert.equal(lines.length, 1);
  const order = await db.order.findUniqueOrThrow({ where: { id: (await res.json()).orderId } });
  assert.equal(order.deliveryFee, 0);
  assert.equal(order.fulfillmentType, "PICKUP");
});

test("delivery to a postcode with no approved zone is refused (400) without writing", async () => {
  const p = await product();
  const before = await orderCount();
  const payload = { ...body([{ productId: p.id, quantity: 1 }]), customer: customer({ postcode: "7000" }) };
  const res = await handleCheckout(request(payload), deps());
  assert.equal(res.status, 400);
  assert.equal((await res.json()).code, "DELIVERY_UNAVAILABLE");
  assert.equal(await orderCount(), before);
});

test("pending or unapproved products are rejected with a 409 conflict list and no rows are written", async () => {
  const pending = await product({ approvalStatus: "PENDING" });
  const unknownStock = await product({ stockQuantity: null });
  const before = await orderCount();
  const res = await handleCheckout(request(body([{ productId: pending.id, quantity: 1 }, { productId: unknownStock.id, quantity: 1 }])), deps());
  assert.equal(res.status, 409);
  const json = await res.json();
  assert.deepEqual(json.conflicts.map((c: { reason: string }) => c.reason).sort(), ["NOT_APPROVED", "STOCK_UNKNOWN"]);
  assert.equal(await orderCount(), before);
});

test("stale quote: stock that disappeared since the shopper saw it is a 409 and reserves nothing", async () => {
  const p = await product({ stockQuantity: 1 });
  const res = await handleCheckout(request(body([{ productId: p.id, quantity: 2 }])), deps());
  assert.equal(res.status, 409);
  assert.equal((await res.json()).conflicts[0].reason, "INSUFFICIENT_STOCK");
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 0);
});

test("two simultaneous checkouts for the last unit: exactly one wins and stock is never oversold", async () => {
  const p = await product({ stockQuantity: 1 });
  const results = await Promise.all(
    [1, 2, 3, 4].map(() => handleCheckout(request(body([{ productId: p.id, quantity: 1 }])), deps()))
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 409, 409, 409]);
  const current = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(current.reservedQuantity, 1);
  assert.equal(current.stockQuantity, 1);
});

test("Stripe failure releases the reservation, cancels the order and logs no customer data", async () => {
  const p = await product({ stockQuantity: 5 });
  const logged: string[] = [];
  const spy = mock.method(console, "error", (...args: unknown[]) => { logged.push(args.map(String).join(" ")); });
  try {
    const { stripe } = fakeStripe({ failCreate: true });
    const res = await handleCheckout(request(body([{ productId: p.id, quantity: 2 }])), deps({ stripe }));
    assert.equal(res.status, 502);
    const json = await res.json();
    assert.equal(json.code, "PAYMENT_PROVIDER_ERROR");
    assert.doesNotMatch(JSON.stringify(json), /stack|at .*\.ts|jane/i);
  } finally {
    spy.mock.restore();
  }
  const current = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(current.reservedQuantity, 0, "stock must not stay locked");
  const reservation = await db.inventoryReservation.findFirstOrThrow({ where: { productId: p.id } });
  assert.equal(reservation.status, "RELEASED");
  const order = await db.order.findUniqueOrThrow({ where: { id: reservation.orderId } });
  assert.equal(order.paymentStatus, "FAILED");
  assert.equal(order.orderStatus, "CANCELLED");
  assert.ok(logged.length > 0);
  assert.doesNotMatch(logged.join("\n"), /jane|checkout-test|Stripe said no/i, "error messages can contain PII and must not be logged");
});

test("idempotency: the same key and cart returns the existing open session without a second order or Stripe call", async () => {
  const p = await product({ stockQuantity: 10 });
  const key = uniqueId("idem");
  const { stripe, calls } = fakeStripe();
  const payload = body([{ productId: p.id, quantity: 2 }], { idempotencyKey: key });
  const first = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(first.status, 200);
  const firstJson = await first.json();

  const second = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(second.status, 200);
  const secondJson = await second.json();
  assert.equal(secondJson.orderId, firstJson.orderId);
  assert.equal(secondJson.sessionId, firstJson.sessionId);
  assert.equal(secondJson.url, firstJson.url);
  assert.equal(secondJson.accessToken, null, "the token is never stored, so it cannot be returned again");
  assert.equal(secondJson.replayed, true);
  assert.equal(calls.creates.length, 1);
  assert.equal(await db.order.count({ where: { idempotencyKey: key } }), 1);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 2, "no double reservation");
});

test("idempotency: the same key with a different cart is a 409", async () => {
  const p = await product({ stockQuantity: 10 });
  const key = uniqueId("idem");
  const { stripe } = fakeStripe();
  assert.equal((await handleCheckout(request(body([{ productId: p.id, quantity: 1 }], { idempotencyKey: key })), deps({ stripe }))).status, 200);
  const other = await handleCheckout(request(body([{ productId: p.id, quantity: 2 }], { idempotencyKey: key })), deps({ stripe }));
  assert.equal(other.status, 409);
  assert.equal((await other.json()).code, "IDEMPOTENCY_KEY_REUSED");
});

test("idempotency cannot return an existing Stripe URL to changed customer details", async () => {
  const p = await product({ stockQuantity: 10 });
  const { stripe } = fakeStripe();
  const payload = body([{ productId: p.id, quantity: 1 }], { idempotencyKey: uniqueId("idem") });
  assert.equal((await handleCheckout(request(payload), deps({ stripe }))).status, 200);
  for (const change of [{ email: "other@checkout-test.invalid" }, { address: "2 Other Street" }, { phone: "0412345679" }]) {
    const changed = { ...payload, customer: { ...payload.customer, ...change } };
    const response = await handleCheckout(request(changed), deps({ stripe }));
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "IDEMPOTENCY_KEY_REUSED");
  }
});

test("idempotency: concurrent duplicate requests create exactly one order", async () => {
  const p = await product({ stockQuantity: 10 });
  const key = uniqueId("idem");
  const { stripe } = fakeStripe();
  const payload = body([{ productId: p.id, quantity: 1 }], { idempotencyKey: key });
  const results = await Promise.all([1, 2, 3].map(() => handleCheckout(request(payload), deps({ stripe }))));
  assert.ok(results.some((r) => r.status === 200));
  assert.ok(results.every((r) => r.status === 200 || r.status === 409));
  assert.equal(await db.order.count({ where: { idempotencyKey: key } }), 1);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 1);
});

test("idempotency: a finished order's key is not reusable", async () => {
  const p = await product({ stockQuantity: 10 });
  const key = uniqueId("idem");
  const { stripe } = fakeStripe({ failCreate: true });
  const payload = body([{ productId: p.id, quantity: 1 }], { idempotencyKey: key });
  assert.equal((await handleCheckout(request(payload), deps({ stripe }))).status, 502);
  const retry = await handleCheckout(request(payload), deps({ stripe: fakeStripe().stripe }));
  assert.equal(retry.status, 409);
  assert.equal((await retry.json()).code, "IDEMPOTENCY_KEY_USED");
});

test("rate limiting: limited callers get 429 with Retry-After, and an unavailable limiter fails closed with 503", async () => {
  const before = await orderCount();
  const limited = await handleCheckout(request(body([])), deps({ rateLimit: async () => ({ ok: false, remaining: 0, retryAfterSec: 42 }) }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "42");
  const unavailable = await handleCheckout(
    request(body([])),
    deps({ db: throwingDb, rateLimit: async () => ({ ok: false, remaining: 0, retryAfterSec: 30, unavailable: true }) })
  );
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).code, "RATE_LIMIT_UNAVAILABLE");
  assert.equal(await orderCount(), before);
});

test("rate limit is keyed per client IP", async () => {
  const keys: string[] = [];
  await handleCheckout(request(body([])), deps({ rateLimit: async (key) => { keys.push(key); return { ok: true, remaining: 1, retryAfterSec: 0 }; } }));
  assert.deepEqual(keys, ["checkout:198.51.100.7"]);
});

test("a database outage during pricing fails closed with 503 DB_UNAVAILABLE and no stack trace", async () => {
  const outage = {
    product: { findMany: async () => { throw new Error("connection refused at 10.0.0.1"); } },
    inventoryReservation: db.inventoryReservation,
    order: db.order,
    deliveryZone: db.deliveryZone,
    deliverySetting: db.deliverySetting,
    $transaction: db.$transaction.bind(db)
  } as unknown as PrismaClient;
  const spy = mock.method(console, "error", () => undefined);
  try {
    const res = await handleCheckout(request(body([{ slug: "cavendish-bananas-1kg", quantity: 1 }])), deps({ db: outage }));
    assert.equal(res.status, 503);
    const json = await res.json();
    assert.equal(json.code, "DB_UNAVAILABLE");
    assert.doesNotMatch(JSON.stringify(json), /10\.0\.0\.1|refused|stack/i);
  } finally {
    spy.mock.restore();
  }
});

test("order numbers are crypto-random, well formed and collision-detectable", () => {
  const numbers = new Set(Array.from({ length: 500 }, () => generateOrderNumber(new Date("2026-10-20T00:00:00Z"))));
  assert.equal(numbers.size, 500);
  for (const n of numbers) assert.match(n, /^FS-261020-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(isUniqueViolation(new Error("x")), false);
});

for (const field of ["price", "unit", "tax", "delivery fee", "delivery approval"] as const) {
  test(`persistence rejects a ${field} edit between pricing and reservation without creating an order`, async () => {
    const p = await product({ stockQuantity: 10 });
    let isolatedPostcode = testPostcode();
    while (await db.deliveryZone.count({ where: { postcodes: { contains: isolatedPostcode } } })) isolatedPostcode = testPostcode();
    const zone = await createTestZone(db, isolatedPostcode, { freeDeliveryMinCents: 100_000 });
    zoneIds.push(zone.id);
    const parsed = validateCheckoutBody(body([{ productId: p.id, quantity: 2 }], {
      customer: customer({ postcode: isolatedPostcode }), idempotencyKey: uniqueId("snapshot")
    }));
    assert.ok(parsed.ok);
    const input = parsed.value;
    const priced = await validateAndPriceOrder(input.items, isolatedPostcode, input.fulfillmentType, db);
    assert.ok(priced.ok);
    if (field === "price") await db.product.update({ where: { id: p.id }, data: { priceCents: p.priceCents! + 100 } });
    if (field === "unit") await db.product.update({ where: { id: p.id }, data: { unit: "500g bag" } });
    if (field === "tax") await db.product.update({ where: { id: p.id }, data: { taxCategory: "TAXABLE_10" } });
    if (field === "delivery fee") await db.deliveryZone.update({ where: { id: zone.id }, data: { deliveryFeeCents: 999 } });
    if (field === "delivery approval") await db.deliveryZone.update({ where: { id: zone.id }, data: { isApproved: false } });
    await assert.rejects(() => persistOrder(db, input, priced, "test-snapshot-hash", new Date()), (error: unknown) => {
      assert.ok(error instanceof StockConflictError);
      assert.ok(error.conflicts.every((conflict) => conflict.reason === "PRICE_CHANGED"));
      return true;
    });
    assert.equal(await db.order.count({ where: { idempotencyKey: input.idempotencyKey } }), 0);
    assert.equal(await db.customer.count({ where: { email: input.customer.email } }), 0);
    assert.equal(await db.inventoryReservation.count({ where: { productId: p.id } }), 0);
    const stock = await db.product.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(stock.stockQuantity, 10);
    assert.equal(stock.reservedQuantity, 0);
  });
}


test("pickup requires an existing active store before reserving stock", async () => {
  const p = await product();
  const { stripe, calls } = fakeStripe();
  const before = await orderCount();
  const payload = body([{ productId: p.id, quantity: 1 }], { fulfillmentType: "PICKUP" });
  assert.equal((await handleCheckout(request(payload), deps({ stripe }))).status, 400);
  assert.equal((await handleCheckout(request({ ...payload, pickupBranchSlug: "unknown-store" }), deps({ stripe }))).status, 409);
  await db.storeBranch.update({ where: { slug: pickupBranchSlug }, data: { isActive: false } });
  try {
    assert.equal((await handleCheckout(request({ ...payload, pickupBranchSlug }), deps({ stripe }))).status, 409);
  } finally {
    await db.storeBranch.update({ where: { slug: pickupBranchSlug }, data: { isActive: true } });
  }
  assert.equal(await orderCount(), before);
  assert.equal(calls.creates.length, 0);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 0);
});


test("delivery requires its approved zone to resolve to an active store", async () => {
  const p = await product();
  const { stripe, calls } = fakeStripe();
  const before = await orderCount();
  const unknownBranchZone = await createTestZone(db, testPostcode(), { primaryBranchSlug: "missing-delivery-store" });
  zoneIds.push(unknownBranchZone.id);
  const payload = body([{ productId: p.id, quantity: 1 }], { customer: customer({ postcode: unknownBranchZone.postcodes }) });
  assert.equal((await handleCheckout(request(payload), deps({ stripe }))).status, 409);
  assert.equal(await orderCount(), before);
  assert.equal(calls.creates.length, 0);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 0);
});


test("a retry during session creation preserves the original pending attempt", async () => {
  const p = await product();
  const payload = body([{ productId: p.id, quantity: 1 }], { idempotencyKey: uniqueId("inflight") });
  const parsed = validateCheckoutBody(payload);
  assert.ok(parsed.ok);
  const priced = await validateAndPriceOrder(parsed.value.items, postcode, "DELIVERY", db);
  assert.ok(priced.ok);
  const order = await persistOrder(db, parsed.value, priced, "test-inflight-hash", new Date());
  const { stripe, calls } = fakeStripe();
  const retry = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(retry.status, 409);
  assert.equal((await retry.json()).code, "IDEMPOTENCY_IN_PROGRESS");
  assert.equal(calls.creates.length, 0);
  assert.equal(await db.order.count({ where: { idempotencyKey: parsed.value.idempotencyKey } }), 1);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "PENDING");
});


test("cross-origin and non-JSON checkout attempts fail before the database or Stripe", async () => {
  const { stripe, calls } = fakeStripe();
  for (const [origin, contentType, status] of [
    ["https://attacker.example", "application/json", 403],
    ["http://localhost", "text/plain", 415],
    ["http://localhost", "application/x-www-form-urlencoded", 415]
  ] as const) {
    const request = new Request("http://localhost/api/checkout/stripe", {
      method: "POST", headers: { origin, "content-type": contentType }, body: "{}"
    });
    const response = await handleCheckout(request, deps({ db: throwingDb, stripe }));
    assert.equal(response.status, status);
  }
  assert.equal(calls.creates.length, 0);
});


test("an uncertain provider response retains the pending order and stock instead of duplicating checkout", async () => {
  const p = await product();
  const payload = body([{ productId: p.id, quantity: 1 }]);
  const { stripe, calls } = fakeStripe();
  const create = stripe.checkout.sessions.create;
  stripe.checkout.sessions.create = async (params, options) => {
    await create(params, options);
    throw Object.assign(new Error("timeout"), { type: "StripeConnectionError" });
  };
  const result = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(result.status, 502);
  assert.equal((await result.json()).code, "PAYMENT_PROVIDER_UNCERTAIN");
  const order = await db.order.findUniqueOrThrow({ where: { idempotencyKey: payload.idempotencyKey }, include: { reservations: true } });
  assert.equal(order.paymentStatus, "PENDING");
  assert.equal(order.reservations[0].status, "ACTIVE");
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 1);
  const retry = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(retry.status, 200);
  const replay = await retry.json();
  assert.equal(replay.replayed, true);
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).stripeSessionId, replay.sessionId);
  assert.equal(calls.creates.length, 1);
  assert.equal(await db.order.count({ where: { idempotencyKey: payload.idempotencyKey } }), 1);
});


test("failed session persistence and uncertain Stripe expiry retain the reservation", async () => {
  const p = await product();
  const payload = body([{ productId: p.id, quantity: 1 }]);
  const { stripe } = fakeStripe();
  stripe.checkout.sessions.expire = async () => { throw new Error("provider unavailable"); };
  const failingDb = new Proxy(db, {
    get(target, prop) {
      if (prop === "order") return new Proxy(target.order, {
        get(model, operation) {
          if (operation === "update") return async () => { throw new Error("database unavailable"); };
          return Reflect.get(model, operation);
        }
      });
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  const result = await handleCheckout(request(payload), deps({ db: failingDb, stripe }));
  assert.equal(result.status, 503);
  const order = await db.order.findUniqueOrThrow({ where: { idempotencyKey: payload.idempotencyKey }, include: { reservations: true } });
  assert.equal(order.paymentStatus, "PENDING");
  assert.equal(order.reservations[0].status, "ACTIVE");
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 1);
  const retry = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).replayed, true);
  assert.ok((await db.order.findUniqueOrThrow({ where: { id: order.id } })).stripeSessionId);
});


for (const scenario of ["duplicate", "amount", "currency", "references", "partial-list", "completed", "expired"] as const) {
  test(`session recovery fails closed for ${scenario} without a second create`, async () => {
    const p = await product();
    const payload = body([{ productId: p.id, quantity: 1 }]);
    const { stripe, calls } = fakeStripe();
    const first = await handleCheckout(request(payload), deps({ stripe }));
    assert.equal(first.status, 200);
    const original = await first.json();
    const order = await db.order.findUniqueOrThrow({ where: { id: original.orderId } });
    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: null } });
    const valid: StripeSessionLike = {
      id: original.sessionId, url: original.url, status: "open", mode: "payment", currency: "aud", amount_total: order.totalCents,
      client_reference_id: order.id, metadata: { orderId: order.id, orderNumber: order.orderNumber }
    };
    const candidate = { ...valid };
    if (scenario === "amount") candidate.amount_total = order.totalCents + 1;
    if (scenario === "currency") candidate.currency = "usd";
    if (scenario === "references") candidate.metadata = { orderId: order.id, orderNumber: "wrong" };
    if (scenario === "completed") candidate.status = "complete";
    if (scenario === "expired") candidate.status = "expired";
    stripe.checkout.sessions.listRecent = async () => ({
      sessions: scenario === "duplicate" ? [candidate, { ...candidate, id: "cs_other" }] : [candidate],
      complete: scenario !== "partial-list"
    });
    stripe.checkout.sessions.retrieve = async () => candidate;
    const retry = await handleCheckout(request(payload), deps({ stripe }));
    assert.equal(retry.status, 409);
    assert.equal((await retry.json()).code, scenario === "expired" ? "IDEMPOTENCY_KEY_USED" : "IDEMPOTENCY_IN_PROGRESS");
    assert.equal(calls.creates.length, 1);
  });
}

test("a stale orphan without a provider session expires before replay instead of remaining pending", async () => {
  const p = await product();
  const payload = body([{ productId: p.id, quantity: 1 }]);
  const parsed = validateCheckoutBody(payload);
  assert.ok(parsed.ok);
  const priced = await validateAndPriceOrder(parsed.value.items, postcode, "DELIVERY", db);
  assert.ok(priced.ok);
  const past = new Date(Date.now() - 40 * 60_000);
  const order = await persistOrder(db, parsed.value, priced, "test-stale-hash", past);
  await db.order.update({ where: { id: order.id }, data: { createdAt: past } });
  const { stripe, calls } = fakeStripe();
  const retry = await handleCheckout(request(payload), deps({ stripe }));
  assert.equal((await retry.json()).code, "IDEMPOTENCY_KEY_USED");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus, "EXPIRED");
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 0);
  assert.equal(calls.creates.length, 0);
});
