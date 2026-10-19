import "./testing/local-db-env";
import test, { after, afterEach, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import {
  escapeHtml,
  formatCents,
  renderBusinessEmail,
  renderCustomerEmail,
  resendOrderEmails,
  sanitizeSubject,
  setEmailTransportForTests,
  type OrderEmailData,
  type OutboundEmail
} from "./email";
import { cleanupTestData, createTestCategory, createTestOrder } from "./testing/db-fixtures";

const SCRIPT = "<script>alert(1)</script>";

function emailData(overrides: Partial<OrderEmailData> = {}): OrderEmailData {
  return {
    orderNumber: "FS-1",
    customerName: SCRIPT,
    customerEmail: "a@example.test",
    customerPhone: "0400000000",
    fulfillmentType: "DELIVERY",
    deliveryAddress: `1 ${SCRIPT} St`,
    deliverySuburb: "<img src=x onerror=alert(1)>",
    deliveryPostcode: "2000",
    deliveryNotes: `"><svg onload=alert(1)>`,
    preferredDeliveryDate: SCRIPT,
    pickupLocation: null,
    items: [{ name: SCRIPT, unit: "<b>kg</b>", quantity: 1, unitPriceCents: 250, totalCents: 250 }],
    subtotalCents: 250,
    deliveryFeeCents: 0,
    gstCents: 0,
    totalCents: 250,
    ...overrides
  };
}

test("escapeHtml neutralises markup and quotes", () => {
  assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  assert.equal(escapeHtml("it's"), "it&#39;s");
  assert.equal(escapeHtml(null), "");
  assert.equal(escapeHtml(42), "42");
});

test("customer and business emails escape every interpolated value", () => {
  for (const html of [renderCustomerEmail(emailData()), renderBusinessEmail(emailData())]) {
    assert.ok(!html.includes("<script>"), "no raw script tag");
    assert.ok(!html.includes("<img src=x"), "no raw img tag");
    assert.ok(!html.includes("<svg onload"), "no raw svg tag");
    assert.ok(!html.includes("<b>kg</b>"));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  }
});

test("emails include order number, items, totals and delivery info", () => {
  const html = renderCustomerEmail(emailData({ customerName: "Sam", deliveryAddress: "1 Test St", deliverySuburb: "Rockdale" }));
  assert.ok(html.includes("FS-1"));
  assert.ok(html.includes("$2.50"));
  assert.ok(html.includes("1 Test St, Rockdale 2000"));
  assert.ok(html.includes("Payment received"));
});

test("sanitizeSubject strips line breaks and formatCents formats dollars", () => {
  assert.equal(sanitizeSubject("Hi\r\nBcc: evil@example.test"), "Hi Bcc: evil@example.test");
  assert.equal(formatCents(1234), "$12.34");
});

let categoryId = "";
const orderIds: string[] = [];
let sent: OutboundEmail[] = [];
const savedEnv: Record<string, string | undefined> = {};
const ENV_KEYS = ["RESEND_API_KEY", "ORDERS_NOTIFICATION_EMAIL", "RESEND_FROM_EMAIL", "ORDER_ACCESS_SECRET"];

before(async () => {
  categoryId = (await createTestCategory(db)).id;
});
beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  delete process.env.ORDERS_NOTIFICATION_EMAIL;
  sent = [];
});
afterEach(() => {
  setEmailTransportForTests(null);
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});
after(async () => {
  await cleanupTestData(db, { orderIds, categoryIds: [categoryId] });
  await db.$disconnect();
});

async function paidOrder(overrides: Record<string, unknown> = {}) {
  const order = await createTestOrder(db, {
    paymentStatus: "PAID",
    orderStatus: "RECEIVED",
    customerName: SCRIPT,
    totalCents: 250,
    total: 2.5,
    subtotal: 2.5,
    ...overrides
  });
  orderIds.push(order.id);
  await db.orderItem.create({
    data: { orderId: order.id, name: SCRIPT, quantity: 1, unit: "each", priceCents: 250, totalCents: 250 }
  });
  return order;
}

test("without a Resend key nothing is claimed and the result says NOT_CONFIGURED", async () => {
  delete process.env.RESEND_API_KEY;
  const order = await paidOrder();
  const result = await resendOrderEmails(order.id);
  assert.deepEqual(result, {
    customer: { sent: false, reason: "NOT_CONFIGURED" },
    business: { sent: false, reason: "NOT_CONFIGURED" }
  });
  const row = await db.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.equal(row.confirmationEmailSentAt, null);
  assert.equal(row.businessEmailSentAt, null);
});

test("unpaid orders get no emails; unknown orders report NOT_FOUND", async () => {
  setEmailTransportForTests(async (m) => void sent.push(m));
  const order = await paidOrder({ paymentStatus: "PENDING", orderStatus: "PENDING_PAYMENT" });
  assert.equal((await resendOrderEmails(order.id)).customer.reason, "NOT_PAID");
  assert.equal((await resendOrderEmails("missing")).customer.reason, "NOT_FOUND");
  assert.equal(sent.length, 0);
});

test("cancelled or reconciliation-held paid orders cannot send normal confirmations, including forced resend", async () => {
  setEmailTransportForTests(async (m) => void sent.push(m));
  for (const orderStatus of ["CANCELLED", "PENDING_PAYMENT"]) {
    const order = await paidOrder({ orderStatus });
    assert.equal((await resendOrderEmails(order.id, { force: true })).customer.reason, "NOT_PAID");
  }
  assert.equal(sent.length, 0);
});

test("paid order: sends once to the customer and the default business address with escaped HTML", async () => {
  setEmailTransportForTests(async (m) => void sent.push(m));
  const order = await paidOrder();
  const first = await resendOrderEmails(order.id);
  assert.deepEqual(first, { customer: { sent: true }, business: { sent: true } });
  assert.deepEqual(sent.map((m) => m.to[0]).sort(), ["info@freshstop.com.au", "test@example.test"].sort());
  assert.ok(sent.every((m) => !m.html.includes("<script>")));
  assert.ok(sent.every((m) => !/[\r\n]/.test(m.subject)));

  const second = await resendOrderEmails(order.id);
  assert.equal(second.customer.reason, "ALREADY_SENT");
  assert.equal(sent.length, 2);
});

test("ORDERS_NOTIFICATION_EMAIL overrides the business recipient and force resends", async () => {
  process.env.ORDERS_NOTIFICATION_EMAIL = "ops@example.test";
  setEmailTransportForTests(async (m) => void sent.push(m));
  const order = await paidOrder();
  await resendOrderEmails(order.id);
  assert.ok(sent.some((m) => m.to[0] === "ops@example.test"));
  await resendOrderEmails(order.id, { force: true });
  assert.equal(sent.length, 4);
});

test("customer emails contain recoverable fragment tracking links without sharing them with the business", async () => {
  process.env.ORDER_ACCESS_SECRET = "local-test-only-tracking-secret-32-bytes";
  setEmailTransportForTests(async (m) => void sent.push(m));
  const order = await paidOrder();
  await resendOrderEmails(order.id);
  const customer = sent.find((m) => m.to[0] === order.customerEmail)!;
  const business = sent.find((m) => m.to[0] === "info@freshstop.com.au")!;
  assert.ok(customer.html.includes("/orders#order="));
  assert.ok(customer.html.includes("amp;t=v1."));
  assert.ok(!business.html.includes("t=v1."));
});

test("a failed send clears the claim so it can be retried; concurrent calls send once", async () => {
  let failing = true;
  setEmailTransportForTests(async (m) => {
    if (failing) throw new Error("down");
    sent.push(m);
  });
  const order = await paidOrder();
  const failed = await resendOrderEmails(order.id);
  assert.equal(failed.customer.reason, "SEND_FAILED");
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).confirmationEmailSentAt, null);

  failing = false;
  await Promise.all([resendOrderEmails(order.id), resendOrderEmails(order.id), resendOrderEmails(order.id)]);
  assert.equal(sent.length, 2);
});

test("a crashed worker lease expires without a false sent marker and retries use the same provider key", async () => {
  const order = await paidOrder({ confirmationEmailClaimedAt: new Date(), businessEmailSentAt: new Date() });
  setEmailTransportForTests(async (m) => void sent.push(m));
  await resendOrderEmails(order.id);
  assert.equal(sent.length, 0, "an active lease prevents a second sender");
  await db.order.update({ where: { id: order.id }, data: { confirmationEmailClaimedAt: new Date(Date.now() - 6 * 60 * 1000) } });
  await resendOrderEmails(order.id);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].idempotencyKey, `fs-${order.id}-confirmationEmailSentAt-0`);
  const row = await db.order.findUniqueOrThrow({ where: { id: order.id } });
  assert.ok(row.confirmationEmailSentAt);
  assert.equal(row.confirmationEmailClaimedAt, null);
});

test("sent timestamps remain empty during provider delivery and forced resends respect active leases", async () => {
  const order = await paidOrder();
  setEmailTransportForTests(async (m) => {
    const row = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    if (m.to[0] === order.customerEmail) {
      assert.equal(row.confirmationEmailSentAt, null);
      assert.ok(row.confirmationEmailClaimedAt);
      assert.equal((await resendOrderEmails(order.id, { force: true })).customer.reason, "IN_PROGRESS");
    }
    sent.push(m);
  });
  await resendOrderEmails(order.id);
  assert.equal(sent.length, 2);
});
