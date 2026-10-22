import "./testing/local-db-env";
import test, { after, afterEach, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { db } from "./db";
import { releaseReservation, reserveStock } from "./inventory";
import { setEmailTransportForTests, type OutboundEmail } from "./email";
import { STALE_PROCESSING_MS, processStripeEvent, safeErrorSummary } from "./payment-events";
import { cleanupTestData, createTestCategory, createTestProduct } from "./testing/db-fixtures";
import {
  chargeRefundedEvent,
  createPendingScenario,
  paymentIntentFailedEvent,
  sessionEvent,
  type PaymentScenario
} from "./testing/payment-fixtures";

const orderIds: string[] = [];
const productIds: string[] = [];
const eventIds: string[] = [];
let categoryId = "";
let sent: OutboundEmail[] = [];
const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["STRIPE_ALLOW_LIVE", "STRIPE_MODE", "VERCEL_ENV", "STRIPE_EXPECTED_ACCOUNT", "RESEND_API_KEY"];

before(async () => {
  categoryId = (await createTestCategory(db)).id;
});

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  delete process.env.STRIPE_ALLOW_LIVE;
  process.env.STRIPE_MODE = "test";
  delete process.env.STRIPE_EXPECTED_ACCOUNT;
  sent = [];
  setEmailTransportForTests(async (message) => {
    sent.push(message);
  });
});

afterEach(() => {
  setEmailTransportForTests(null);
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

after(async () => {
  await db.adminAuditLog.deleteMany({ where: { entityId: { in: orderIds } } });
  await db.paymentEvent.deleteMany({ where: { stripeEventId: { in: eventIds } } });
  await cleanupTestData(db, { orderIds, productIds, categoryIds: [categoryId] });
  await db.$disconnect();
});

async function scenario(options: Parameters<typeof createPendingScenario>[2] = {}): Promise<PaymentScenario> {
  const s = await createPendingScenario(db, categoryId, options);
  orderIds.push(s.orderId);
  productIds.push(s.productId);
  return s;
}

function track(event: Stripe.Event): Stripe.Event {
  eventIds.push(event.id);
  return event;
}

const loadOrder = (id: string) => db.order.findUniqueOrThrow({ where: { id } });
const loadProduct = (id: string) => db.product.findUniqueOrThrow({ where: { id } });
const loadEvent = (id: string) => db.paymentEvent.findUniqueOrThrow({ where: { stripeEventId: id } });

test("paid checkout.session.completed marks PAID, commits stock once and emails after commit", async () => {
  const s = await scenario({ stock: 10, quantity: 2 });
  const result = await processStripeEvent(track(sessionEvent(s)));
  assert.deepEqual(result, { kind: "processed" });

  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(order.orderStatus, "RECEIVED");
  assert.equal(order.amountPaidCents, s.totalCents);
  assert.ok(order.paidAt);
  assert.equal(order.stripePaymentIntentId, `pi_test_${s.orderId}`);
  assert.ok(order.confirmationEmailSentAt);
  assert.ok(order.businessEmailSentAt);

  const product = await loadProduct(s.productId);
  assert.equal(product.stockQuantity, 8);
  assert.equal(product.reservedQuantity, 0);
  assert.equal(sent.length, 2);
  const audit = await db.adminAuditLog.findFirstOrThrow({ where: { entityId: s.orderId, action: "PAYMENT_PAID" } });
  assert.equal(audit.adminUser, "stripe-webhook");
});

test("completed but unpaid keeps the order PENDING and does not touch stock", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s, { paymentStatus: "unpaid" })));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PENDING");
  assert.equal(order.orderStatus, "PENDING_PAYMENT");
  assert.equal((await loadProduct(s.productId)).reservedQuantity, s.quantity);
  assert.equal(sent.length, 0);
});

test("async payment success after an unpaid completed event marks PAID", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s, { paymentStatus: "unpaid" })));
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.async_payment_succeeded" })));
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PAID");
  assert.equal((await loadProduct(s.productId)).stockQuantity, 10 - s.quantity);
});

test("async payment failure marks FAILED, cancels the order and releases the reservation", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.async_payment_failed", paymentStatus: "unpaid" })));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "FAILED");
  assert.equal(order.orderStatus, "CANCELLED");
  assert.ok(order.cancelledAt);
  const product = await loadProduct(s.productId);
  assert.equal(product.reservedQuantity, 0);
  assert.equal(product.stockQuantity, 10);
  assert.equal((await db.inventoryReservation.findFirstOrThrow({ where: { orderId: s.orderId } })).status, "RELEASED");
});

test("expired session marks EXPIRED, cancels and releases", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.expired", paymentStatus: "unpaid" })));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "EXPIRED");
  assert.equal(order.orderStatus, "CANCELLED");
  assert.equal((await db.inventoryReservation.findFirstOrThrow({ where: { orderId: s.orderId } })).status, "EXPIRED");
  assert.equal((await loadProduct(s.productId)).reservedQuantity, 0);
});

test("payment_intent.payment_failed records FAILED via metadata without releasing stock", async () => {
  const s = await scenario();
  await processStripeEvent(track(paymentIntentFailedEvent(s)));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "FAILED");
  assert.equal(order.orderStatus, "PENDING_PAYMENT");
  assert.equal((await loadProduct(s.productId)).reservedQuantity, s.quantity);
});

test("a retry that succeeds after a declined attempt still marks PAID and commits stock", async () => {
  const s = await scenario();
  await processStripeEvent(track(paymentIntentFailedEvent(s)));
  await processStripeEvent(track(sessionEvent(s)));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(order.orderStatus, "RECEIVED");
  assert.equal((await loadProduct(s.productId)).stockQuantity, 10 - s.quantity);
});

test("a payment_failed event never downgrades a PAID order", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s)));
  await processStripeEvent(track(paymentIntentFailedEvent(s)));
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PAID");
});

test("expired arriving after paid does nothing (out-of-order safe)", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s)));
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.expired", paymentStatus: "unpaid" })));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(order.orderStatus, "RECEIVED");
  assert.equal((await loadProduct(s.productId)).stockQuantity, 10 - s.quantity);
});

test("late payment on an expired order re-claims free stock and revives the order", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.expired", paymentStatus: "unpaid" })));
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.async_payment_succeeded" })));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(order.orderStatus, "RECEIVED");
  assert.equal(order.cancelledAt, null);
  const product = await loadProduct(s.productId);
  assert.equal(product.stockQuantity, 10 - s.quantity);
  assert.equal(product.reservedQuantity, 0);
  assert.equal((await db.inventoryReservation.findFirstOrThrow({ where: { orderId: s.orderId } })).status, "COMMITTED");
  assert.equal(sent.length, 2);
});

test("late payment after the sweeper expired the order with no free stock is PAID, NEEDS_REVIEW, no deduction", async () => {
  const s = await scenario({ stock: 10, quantity: 2 });
  await db.$transaction((tx) => releaseReservation(tx, s.orderId, "EXPIRED"));
  await db.order.update({ where: { id: s.orderId }, data: { paymentStatus: "EXPIRED", orderStatus: "CANCELLED", cancelledAt: new Date() } });
  await db.product.update({ where: { id: s.productId }, data: { stockQuantity: 1 } });
  const late = track(sessionEvent(s, { type: "checkout.session.async_payment_succeeded" }));
  assert.deepEqual(await processStripeEvent(late), { kind: "processed" });
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(order.orderStatus, "CANCELLED");
  assert.equal((await loadProduct(s.productId)).stockQuantity, 1, "stock untouched");
  assert.match((await loadEvent(late.id)).lastError ?? "", /^NEEDS_REVIEW/);
  assert.ok(await db.adminAuditLog.findFirst({ where: { entityId: s.orderId, action: "PAYMENT_NEEDS_REVIEW" } }));
  assert.equal(sent.length, 0, "no customer confirmation for an order that needs review");
});

test("a multi-line late payment with one stock shortfall rolls back every stock reconciliation", async () => {
  const s = await scenario({ stock: 10, quantity: 2 });
  const second = await createTestProduct(db, categoryId, { stockQuantity: 10, priceCents: 500 });
  productIds.push(second.id);
  await db.orderItem.create({ data: { orderId: s.orderId, productId: second.id, name: "Second line", quantity: 2, unit: "each", priceCents: 500, totalCents: 1000 } });
  await db.$transaction((tx) => reserveStock(tx, s.orderId, [{ productId: second.id, quantity: 2 }], 30));
  s.totalCents += 1000;
  await db.order.update({ where: { id: s.orderId }, data: { totalCents: s.totalCents, total: s.totalCents / 100 } });
  await db.$transaction((tx) => releaseReservation(tx, s.orderId, "EXPIRED"));
  await db.order.update({ where: { id: s.orderId }, data: { paymentStatus: "EXPIRED", orderStatus: "CANCELLED", cancelledAt: new Date() } });
  // Force the second product to be processed after the available first line.
  const sortedIds = [s.productId, second.id].sort();
  const shortProductId = sortedIds[1];
  await db.product.update({ where: { id: shortProductId }, data: { stockQuantity: 1 } });
  const event = track(sessionEvent(s));
  assert.deepEqual(await processStripeEvent(event), { kind: "processed" });
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(order.orderStatus, "CANCELLED");
  assert.equal((await loadProduct(sortedIds[0])).stockQuantity, 10);
  assert.equal((await loadProduct(shortProductId)).stockQuantity, 1);
  const reservations = await db.inventoryReservation.findMany({ where: { orderId: s.orderId } });
  assert.equal(reservations.length, 2);
  assert.ok(reservations.every((reservation) => reservation.status === "EXPIRED"));
  assert.match((await loadEvent(event.id)).lastError ?? "", /no stock changes committed/);
  assert.equal(sent.length, 0);
});

test("duplicate event ids cause no second stock commit and no second email", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s));
  assert.equal((await processStripeEvent(event)).kind, "processed");
  assert.equal((await processStripeEvent(event)).kind, "duplicate");
  assert.equal((await loadProduct(s.productId)).stockQuantity, 10 - s.quantity);
  assert.equal(sent.length, 2);
  assert.equal((await loadEvent(event.id)).status, "PROCESSED");
});

test("late payment after explicit cancellation stays cancelled, preserves stock and suppresses confirmation retries", async () => {
  const s = await scenario();
  await db.$transaction((tx) => releaseReservation(tx, s.orderId, "RELEASED"));
  await db.order.update({ where: { id: s.orderId }, data: { paymentStatus: "EXPIRED", orderStatus: "CANCELLED", cancelledAt: new Date() } });
  await db.adminAuditLog.create({ data: { entityType: "Order", entityId: s.orderId, action: "ORDER_CANCELLED", adminUser: "test-admin" } });
  const event = track(sessionEvent(s));
  await processStripeEvent(event);
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PAID");
  assert.equal((await loadOrder(s.orderId)).orderStatus, "CANCELLED");
  assert.equal((await loadProduct(s.productId)).stockQuantity, 10);
  assert.match((await loadEvent(event.id)).lastError ?? "", /^NEEDS_REVIEW/);
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.async_payment_succeeded" })));
  assert.equal(sent.length, 0);
});

test("conflicting order references are flagged without payment or stock changes", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s));
  (event.data.object as Stripe.Checkout.Session).metadata = { orderId: "another-order" };
  assert.deepEqual(await processStripeEvent(event), { kind: "flagged", reason: "ORDER_REFERENCE_MISMATCH" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
});

test("refunds exceeding the paid amount are flagged without changing payment state", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s)));
  assert.deepEqual(await processStripeEvent(track(chargeRefundedEvent(`pi_test_${s.orderId}`, s.totalCents + 1))), {
    kind: "flagged", reason: "INVALID_REFUND_AMOUNT_OR_CURRENCY"
  });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PAID");
  assert.equal((await loadOrder(s.orderId)).refundedCents, 0);
});

test("concurrent deliveries of the same event commit stock exactly once", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s));
  const results = await Promise.all([processStripeEvent(event), processStripeEvent(event), processStripeEvent(event)]);
  assert.equal(results.filter((r) => r.kind === "processed").length, 1);
  assert.ok(results.every((r) => ["processed", "duplicate", "in_progress"].includes(r.kind)));
  assert.equal((await loadProduct(s.productId)).stockQuantity, 10 - s.quantity);
  assert.equal(sent.length, 2);
});

test("concurrent completed + async_succeeded events (different ids) commit stock exactly once", async () => {
  const s = await scenario();
  const a = track(sessionEvent(s, { type: "checkout.session.completed" }));
  const b = track(sessionEvent(s, { type: "checkout.session.async_payment_succeeded" }));
  await Promise.all([processStripeEvent(a), processStripeEvent(b)]);
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PAID");
  assert.equal((await loadProduct(s.productId)).stockQuantity, 10 - s.quantity);
  assert.equal(sent.length, 2);
});

test("amount mismatch is not marked paid, is recorded FAILED/AMOUNT_MISMATCH and audited", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s, { amountTotal: s.totalCents - 1 }));
  assert.deepEqual(await processStripeEvent(event), { kind: "flagged", reason: "AMOUNT_MISMATCH" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
  const row = await loadEvent(event.id);
  assert.equal(row.status, "FAILED");
  assert.equal(row.lastError, "AMOUNT_MISMATCH");
  assert.ok(await db.adminAuditLog.findFirst({ where: { entityId: s.orderId, action: "PAYMENT_FLAGGED" } }));
  assert.equal((await loadProduct(s.productId)).reservedQuantity, s.quantity);
  assert.equal(sent.length, 0);
});

test("currency mismatch is not marked paid", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s, { currency: "usd" }));
  assert.deepEqual(await processStripeEvent(event), { kind: "flagged", reason: "CURRENCY_MISMATCH" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
});

test("wrong session id is not marked paid", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s, { sessionId: "cs_test_someone_elses" }));
  assert.deepEqual(await processStripeEvent(event), { kind: "flagged", reason: "WRONG_SESSION" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
});

test("a wrong-session expiry event does not cancel the order", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.expired", sessionId: "cs_test_other", paymentStatus: "unpaid" })));
  const order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PENDING");
  assert.equal(order.orderStatus, "PENDING_PAYMENT");
});

test("live-mode events are rejected unless STRIPE_ALLOW_LIVE is true", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s, { livemode: true }));
  assert.deepEqual(await processStripeEvent(event), { kind: "ignored", reason: "LIVEMODE_REJECTED" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
  assert.equal((await loadEvent(event.id)).status, "IGNORED");
});

test("events from an unexpected Stripe account are flagged", async () => {
  process.env.STRIPE_EXPECTED_ACCOUNT = "acct_1USJ2G7k4A7HyNzJ";
  const s = await scenario();
  const event = track(sessionEvent(s, { account: "acct_other" }));
  assert.deepEqual(await processStripeEvent(event), { kind: "flagged", reason: "ACCOUNT_MISMATCH" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
});

test("test events cannot reconcile orders in a live deployment", async () => {
  process.env.STRIPE_MODE = "live";
  process.env.STRIPE_ALLOW_LIVE = "true";
  process.env.VERCEL_ENV = "production";
  process.env.STRIPE_EXPECTED_ACCOUNT = "acct_verifiedLiveFixture";
  const s = await scenario();
  assert.deepEqual(await processStripeEvent(track(sessionEvent(s))), { kind: "ignored", reason: "TESTMODE_REJECTED" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
  assert.equal(sent.length, 0);
});

test("a session cannot pay an order recorded against another Stripe account", async () => {
  const s = await scenario({ orderOverrides: { stripeAccountId: "acct_other" } });
  assert.deepEqual(await processStripeEvent(track(sessionEvent(s))), { kind: "flagged", reason: "ORDER_ACCOUNT_MISMATCH" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
  assert.equal((await loadProduct(s.productId)).reservedQuantity, s.quantity);
});

test("a paid session cannot replace the recorded payment intent", async () => {
  const s = await scenario({ orderOverrides: { stripePaymentIntentId: "pi_recorded" } });
  assert.deepEqual(await processStripeEvent(track(sessionEvent(s))), { kind: "flagged", reason: "WRONG_PAYMENT_INTENT" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");
});

test("a refund arriving before checkout payment is retried and reconciled after payment", async () => {
  const s = await scenario();
  const refund = track(chargeRefundedEvent(`pi_test_${s.orderId}`, s.totalCents));
  assert.deepEqual(await processStripeEvent(refund), { kind: "error" });
  assert.equal((await loadEvent(refund.id)).status, "FAILED");
  await processStripeEvent(track(sessionEvent(s)));
  assert.deepEqual(await processStripeEvent(refund), { kind: "processed" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "REFUNDED");
  assert.equal((await loadOrder(s.orderId)).refundedCents, s.totalCents);
  assert.equal(sent.length, 2);
});

test("unknown order is recorded FAILED/ORDER_NOT_FOUND and not retried forever", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s, { orderId: "does-not-exist" }));
  assert.deepEqual(await processStripeEvent(event), { kind: "flagged", reason: "ORDER_NOT_FOUND" });
});

test("a FAILED event is re-claimable and succeeds on retry", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s));
  // First delivery fails because the order has no recorded session yet (transient).
  await db.order.update({ where: { id: s.orderId }, data: { stripeSessionId: null } });
  assert.deepEqual(await processStripeEvent(event), { kind: "error" });
  const failed = await loadEvent(event.id);
  assert.equal(failed.status, "FAILED");
  assert.match(failed.lastError ?? "", /ORDER_SESSION_NOT_RECORDED/);
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");

  await db.order.update({ where: { id: s.orderId }, data: { stripeSessionId: s.sessionId } });
  assert.deepEqual(await processStripeEvent(event), { kind: "processed" });
  const row = await loadEvent(event.id);
  assert.equal(row.status, "PROCESSED");
  assert.equal(row.attempts, 2);
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PAID");
});

test("a fresh PROCESSING claim is not stolen, a stale one is re-claimed", async () => {
  const s = await scenario();
  const event = track(sessionEvent(s));
  await db.paymentEvent.create({
    data: { stripeEventId: event.id, eventType: event.type, status: "PROCESSING", attempts: 1, processedAt: new Date() }
  });
  assert.deepEqual(await processStripeEvent(event), { kind: "in_progress" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PENDING");

  await db.paymentEvent.update({
    where: { stripeEventId: event.id },
    data: { processedAt: new Date(Date.now() - STALE_PROCESSING_MS - 1000) }
  });
  assert.deepEqual(await processStripeEvent(event), { kind: "processed" });
  assert.equal((await loadOrder(s.orderId)).paymentStatus, "PAID");
});

test("email failure does not fail the webhook and the email can be retried without duplicates", async () => {
  const s = await scenario();
  let fail = true;
  const attempts: string[] = [];
  setEmailTransportForTests(async (message) => {
    attempts.push(message.to.join(","));
    if (fail) throw new Error("provider down for secret@example.test");
  });
  const first = track(sessionEvent(s));
  assert.deepEqual(await processStripeEvent(first), { kind: "processed" });
  let order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PAID");
  assert.equal(order.confirmationEmailSentAt, null);
  assert.equal(order.businessEmailSentAt, null);

  fail = false;
  // A later, different event for the same paid order retries the unsent emails.
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.async_payment_succeeded" })));
  order = await loadOrder(s.orderId);
  assert.ok(order.confirmationEmailSentAt);
  assert.ok(order.businessEmailSentAt);
  const afterRetry = attempts.length;
  await processStripeEvent(track(sessionEvent(s, { type: "checkout.session.async_payment_succeeded" })));
  assert.equal(attempts.length, afterRetry, "no further sends once both are claimed");
});

test("charge.refunded records partial then full refunds without deleting anything", async () => {
  const s = await scenario();
  await processStripeEvent(track(sessionEvent(s)));
  const pi = `pi_test_${s.orderId}`;
  await processStripeEvent(track(chargeRefundedEvent(pi, 300)));
  let order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "PARTIALLY_REFUNDED");
  assert.equal(order.refundedCents, 300);

  await processStripeEvent(track(chargeRefundedEvent(pi, s.totalCents)));
  order = await loadOrder(s.orderId);
  assert.equal(order.paymentStatus, "REFUNDED");
  assert.equal(order.refundedCents, s.totalCents);

  // An older, smaller cumulative total arriving late must not reduce the recorded refund.
  await processStripeEvent(track(chargeRefundedEvent(pi, 300)));
  order = await loadOrder(s.orderId);
  assert.equal(order.refundedCents, s.totalCents);
  assert.equal(order.paymentStatus, "REFUNDED");
  assert.equal(await db.orderItem.count({ where: { orderId: s.orderId } }), 1);
});

test("unmatched refunds remain retryable and visible for reconciliation review", async () => {
  const unmatched = track(chargeRefundedEvent("pi_not_yet_recorded", 100));
  assert.deepEqual(await processStripeEvent(unmatched), { kind: "error" });
  const record = await loadEvent(unmatched.id);
  assert.equal(record.status, "FAILED");
  assert.match(record.lastError ?? "", /REFUND_ORDER_NOT_RECONCILED/);
  assert.deepEqual(await processStripeEvent(unmatched), { kind: "error" });
  assert.equal((await loadEvent(unmatched.id)).attempts, 2);
});

test("unhandled event types are IGNORED", async () => {
  const other = track({ ...sessionEvent(await scenario()), type: "customer.created" } as Stripe.Event);
  assert.equal((await processStripeEvent(other)).kind, "ignored");
});

test("safeErrorSummary truncates and strips email addresses", () => {
  const summary = safeErrorSummary(new Error(`failed for person@example.com ${"x".repeat(1000)}`));
  assert.ok(summary.length <= 300);
  assert.ok(!summary.includes("person@example.com"));
});
