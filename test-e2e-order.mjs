import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { getPickupSlots } from "./src/lib/pickup-slots.ts";

// This test creates orders. Both the HTTP server and database must be disposable local targets.
const base = new URL(process.env.BASE_URL || "http://localhost:3100");
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
const local = (host) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
assert.ok(local(base.hostname) && local(database.hostname), "E2E writes require localhost HTTP and PostgreSQL targets");
assert.equal(process.env.ALLOW_LOCAL_E2E_WRITES, "1", "Set ALLOW_LOCAL_E2E_WRITES=1 only for a disposable local database");
assert.ok(process.env.ADMIN_PASSWORD, "Local ADMIN_PASSWORD is required");
const auth = `Basic ${Buffer.from(`${process.env.ADMIN_USER || "admin"}:${process.env.ADMIN_PASSWORD}`).toString("base64")}`;
let checks = 0;
let requests = 0;
async function request(path, body, headers = {}, method = body ? "POST" : "GET") {
  const response = await fetch(new URL(path, base), { method, headers: { "Content-Type": "application/json", "x-forwarded-for": `local-qa-${process.pid}-${++requests}`, ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text() };
}
function pass(label) { checks++; console.log(`PASS ${label}`); }

const products = await request("/api/products?branch=rockdale");
assert.equal(products.status, 200);
assert.ok(products.data.length > 0);
const product = products.data.find((p) => p.price != null && p.unit && p.inventory?.length !== 0 && p.isPublished !== false);
assert.ok(product, "A priced product is required");
pass("Real seeded catalogue and branch availability");
for (const [postcode, subtotal, fee, branch] of [["2216", 65, 9.99, "rockdale"], ["2210", 165, 0, "riverwood"]]) {
  const quote = await request("/api/delivery/check", { postcode, subtotal });
  assert.equal(quote.data.eligible, true);
  assert.equal(quote.data.deliveryFee, fee);
  assert.equal(quote.data.assignedBranch, branch);
}
assert.equal((await request("/api/delivery/check", { postcode: "9999", subtotal: 200 })).data.eligible, false);
pass("Postcode dispatch, delivery fee and free delivery threshold");
assert.equal((await request("/api/admin/orders")).status, 401);
pass("Anonymous admin access rejected");
const payload = {
  fulfillmentType: "PICKUP", branchSlug: "rockdale", customerName: "Local QA Customer",
  customerEmail: "qa@example.test", customerPhone: "0412345678",
  pickupTimeslot: getPickupSlots()[0].value,
  items: [{ id: product.id, quantity: 2, price: 0.01 }], paymentMethod: "PAY_ON_PICKUP"
};
assert.equal((await request("/api/checkout", { ...payload, paymentMethod: "STRIPE" })).status, 400);
assert.equal((await request("/api/checkout", { ...payload, pickupTimeslot: "expired" })).status, 400);
pass("Disabled card payments and invalid pickup slots rejected");
const key = randomUUID();
assert.equal((await request("/api/checkout", payload)).status, 400);
pass("Valid checkout without a retry identifier rejected");
const [order, replay] = await Promise.all([request("/api/checkout", payload, { "Idempotency-Key": key }), request("/api/checkout", payload, { "Idempotency-Key": key })]);
assert.equal(replay.status, 200);
assert.equal(order.data.orderId, replay.data.orderId);
assert.equal((await request("/api/checkout", { ...payload, customerName: "Changed Customer" }, { "Idempotency-Key": key })).status, 409);
pass("Concurrent duplicate submission returns one order; changed payload conflicts");
assert.equal(order.status, 200, JSON.stringify(order.data));
assert.ok(order.data.confirmationToken);
const actualPrice = product.isSpecial && product.specialPrice != null ? product.specialPrice : product.price;
assert.equal(order.data.total, Number((actualPrice * 2).toFixed(2)));
pass("Pickup order persisted with server-authoritative pricing and signed confirmation");
const lookup = await request("/api/orders/lookup", { orderId: order.data.orderId, email: "qa@example.test" });
assert.equal(lookup.status, 200);
assert.ok(lookup.data.token);
const referenceLookup = await request("/api/orders/lookup", { orderId: order.data.orderNumber, email: "qa@example.test" });
assert.equal(referenceLookup.status, 200);
assert.equal(referenceLookup.data.orderId, order.data.orderId);
assert.equal((await request("/api/orders/lookup", { orderId: order.data.orderId, email: "wrong@example.test" })).status, 404);
pass("Order lookup requires matching email");
const publicPage = await fetch(new URL(`/order-confirmation/${order.data.orderId}`, base)).then(r => r.text());
assert.ok(!publicPage.includes("Local QA Customer"));
const privatePage = await fetch(new URL(`/order-confirmation/${order.data.orderId}?t=${encodeURIComponent(order.data.confirmationToken)}`, base)).then(r => r.text());
assert.ok(privatePage.includes("Local QA Customer"));
pass("Confirmation hides contact details without a signed token");
const admin = await request("/api/admin/orders", undefined, { Authorization: auth });
assert.equal(admin.status, 200);
const saved = admin.data.find(item => item.id === order.data.orderId);
assert.equal(saved.paymentStatus, "PENDING");
for (const orderStatus of ["PREPARING", "READY"]) {
  const changed = await request("/api/admin/orders", { orderId: saved.id, orderStatus }, { Authorization: auth }, "PATCH");
  assert.equal(changed.status, 200);
  assert.equal(changed.data.order.orderStatus, orderStatus);
}
pass("Authenticated admin lifecycle; unpaid order remains pending");
const delivery = await request("/api/checkout", {
  ...payload, fulfillmentType: "DELIVERY", deliveryAddress: "1 Test Street",
  deliveryPostcode: "2210", items: [{ id: product.id, quantity: Math.ceil(50 / actualPrice) }]
}, { "Idempotency-Key": randomUUID() });
assert.equal(delivery.status, 200, JSON.stringify(delivery.data));
const afterDelivery = await request("/api/admin/orders", undefined, { Authorization: auth });
const dispatch = afterDelivery.data.find(item => item.id === delivery.data.orderId);
assert.equal(dispatch.storeBranch.slug, "riverwood");
assert.equal(dispatch.paymentStatus, "PENDING");
assert.equal(dispatch.deliveryFee, 9.99);
pass("Delivery order dispatches from postcode branch with verified fee and pending payment");
const db = new PrismaClient();
try {
  const branch = await db.storeBranch.findUniqueOrThrow({ where: { slug: "rockdale" } });
  const inventory = await db.branchInventory.findUniqueOrThrow({ where: { storeBranchId_productId: { storeBranchId: branch.id, productId: product.id } } });
  try {
    await db.storeBranch.update({ where: { id: branch.id }, data: { isActive: false } });
    assert.equal((await request("/api/checkout", payload, { "Idempotency-Key": randomUUID() })).status, 404);
    assert.equal((await request("/api/checkout", payload, { "Idempotency-Key": key })).data.orderId, order.data.orderId);
    pass("Inactive pickup branch rejected; completed replay survives branch changes");
  } finally { await db.storeBranch.update({ where: { id: branch.id }, data: { isActive: branch.isActive } }); }
  try {
    await db.branchInventory.update({ where: { id: inventory.id }, data: { isAvailable: false } });
    assert.equal((await request("/api/checkout", payload, { "Idempotency-Key": randomUUID() })).status, 400);
    assert.equal((await request("/api/checkout", payload, { "Idempotency-Key": key })).data.orderId, order.data.orderId);
    pass("Unavailable branch inventory rejected; completed replay survives stock changes");
    await db.branchInventory.delete({ where: { id: inventory.id } });
    assert.equal((await request("/api/checkout", payload, { "Idempotency-Key": randomUUID() })).status, 400);
    pass("Missing branch inventory rejected");
  } finally { await db.branchInventory.upsert({ where: { storeBranchId_productId: { storeBranchId: branch.id, productId: product.id } }, create: inventory, update: { isAvailable: inventory.isAvailable } }); }
  const dispatchBranch = await db.storeBranch.findUniqueOrThrow({ where: { slug: "riverwood" } });
  try {
    await db.storeBranch.update({ where: { id: dispatchBranch.id }, data: { isActive: false } });
    const rejected = await request("/api/checkout", { ...payload, fulfillmentType: "DELIVERY", deliveryAddress: "1 Test Street", deliveryPostcode: "2210", items: [{ id: product.id, quantity: Math.ceil(50 / actualPrice) }] }, { "Idempotency-Key": randomUUID() });
    assert.equal(rejected.status, 404);
    pass("Inactive postcode dispatch branch rejected");
  } finally { await db.storeBranch.update({ where: { id: dispatchBranch.id }, data: { isActive: dispatchBranch.isActive } }); }
} finally { await db.$disconnect(); }
console.log(`${checks} integration checks passed. All writes were local test data.`);
