import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { getPickupSlots } from "./src/lib/pickup-slots.ts";

// Writes products and attempts orders. HTTP server and database must be disposable local targets.
const base = new URL(process.env.BASE_URL || "http://localhost:3100");
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid/invalid");
const local = (host) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
assert.ok(local(base.hostname) && local(database.hostname), "Integration writes require localhost HTTP and PostgreSQL targets");
assert.equal(process.env.ALLOW_LOCAL_E2E_WRITES, "1", "Set ALLOW_LOCAL_E2E_WRITES=1 only for a disposable local database");
assert.ok(process.env.ADMIN_PASSWORD, "Local ADMIN_PASSWORD is required");
const auth = `Basic ${Buffer.from(`${process.env.ADMIN_USER || "admin"}:${process.env.ADMIN_PASSWORD}`).toString("base64")}`;
const db = new PrismaClient();
let n = 0;
let checks = 0;
const pass = (label) => { checks++; console.log(`PASS ${label}`); };
async function call(path, { method = "GET", body, headers = {}, admin = false } = {}) {
  const res = await fetch(new URL(path, base), {
    method,
    headers: { "Content-Type": "application/json", "x-forwarded-for": `catalogue-qa-${process.pid}-${++n}`, ...(admin ? { authorization: auth } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const type = res.headers.get("content-type") || "";
  return { status: res.status, data: type.includes("json") ? await res.json() : await res.text() };
}
const checkout = (id, extra = {}) => call("/api/checkout", {
  method: "POST",
  headers: { "Idempotency-Key": randomUUID() },
  body: {
    fulfillmentType: "PICKUP", branchSlug: "rockdale", customerName: "Catalogue QA", customerEmail: "qa@example.test",
    customerPhone: "0412345678", pickupTimeslot: getPickupSlots()[0].value, paymentMethod: "PAY_ON_PICKUP",
    items: [{ id, quantity: 1, price: 0.01 }], ...extra
  }
});

const rockdale = await db.storeBranch.findUniqueOrThrow({ where: { slug: "rockdale" } });
const ordersBefore = await db.order.count();

// 1. Imported additions are listed with a null price and no invented data.
const list = await call("/api/products?category=vegetables");
assert.equal(list.status, 200);
const carrots = list.data.find((p) => p.slug === "fresh-carrots");
assert.ok(carrots, "imported Carrots should be listed (published in the disposable DB)");
assert.equal(carrots.price, null);
assert.equal(carrots.unit, null);
pass("Imported unpriced product listed with null price and unit");

// 2. Unpriced product cannot be bought, even when a branch inventory row exists.
await db.branchInventory.upsert({
  where: { storeBranchId_productId: { storeBranchId: rockdale.id, productId: carrots.id } },
  create: { storeBranchId: rockdale.id, productId: carrots.id, isAvailable: true }, update: { isAvailable: true }
});
const rejected = await checkout(carrots.id);
assert.equal(rejected.status, 400, JSON.stringify(rejected.data));
assert.match(rejected.data.error, /enquire|cannot be ordered/i);
assert.equal(await db.order.count(), ordersBefore);
pass("Unpriced product rejected by checkout and no order written");
await db.branchInventory.delete({ where: { storeBranchId_productId: { storeBranchId: rockdale.id, productId: carrots.id } } });

// 3. Admin routes require authentication and a same-origin request.
const draftBody = { name: "QA Test Product", categoryId: carrots.categoryId, imageUrl: carrots.imageUrl, price: "4.5", unit: "kg", isPublished: false, branchAvailability: { rockdale: true } };
assert.equal((await call("/api/admin/products")).status, 401);
assert.equal((await call("/api/admin/products", { method: "POST", body: draftBody })).status, 401);
assert.equal((await call(`/api/admin/products/${carrots.id}`, { method: "PATCH", body: draftBody })).status, 401);
assert.equal((await call("/api/admin/product-images")).status, 401);
assert.equal((await call("/api/admin/products", { method: "POST", admin: true, body: draftBody, headers: { origin: "https://evil.test" } })).status, 403);
pass("Admin product APIs reject anonymous and cross-origin requests");

// 4. Validation: price alone does not publish; publishing needs unit and branch availability.
const created = await call("/api/admin/products", { method: "POST", admin: true, body: draftBody });
assert.equal(created.status, 201, JSON.stringify(created.data));
const id = created.data.product.id;
const slug = created.data.product.slug;
assert.equal(created.data.product.isPublished, false);
assert.equal((await call("/api/products?q=QA%20Test%20Product")).data.length, 0);
const hidden = await call(`/products/${slug}`);
// A parent loading.tsx can flush a 200 shell before notFound() runs; content must still be absent and noindex.
assert.ok(hidden.status === 404 || (hidden.status === 200 && /noindex/.test(hidden.data)), `unexpected status ${hidden.status}`);
assert.doesNotMatch(hidden.data, /QA Test Product/);
pass("Price entry creates an unpublished draft that is hidden from storefront");
assert.equal((await checkout(id)).status, 400);
pass("Unpublished priced product rejected by checkout");
const noUnit = await call(`/api/admin/products/${id}`, { method: "PATCH", admin: true, body: { ...draftBody, unit: "", isPublished: true } });
assert.equal(noUnit.status, 422);
assert.ok(noUnit.data.fields.unit);
const noBranch = await call(`/api/admin/products/${id}`, { method: "PATCH", admin: true, body: { ...draftBody, isPublished: true, branchAvailability: { rockdale: false, riverwood: false } } });
assert.equal(noBranch.status, 422);
assert.ok(noBranch.data.fields.branchAvailability);
assert.equal((await call(`/api/admin/products/${id}`, { method: "PATCH", admin: true, body: { ...draftBody, price: "0", isPublished: true } })).status, 422);
pass("Publish blocked without unit, branch availability or a positive price");

// 5. A fully valid product goes live and can be bought; removing its price blocks purchase again.
const live = await call(`/api/admin/products/${id}`, { method: "PATCH", admin: true, body: { ...draftBody, isPublished: true } });
assert.equal(live.status, 200, JSON.stringify(live.data));
assert.equal((await call(`/products/${slug}`)).status, 200);
const bought = await checkout(id);
assert.equal(bought.status, 200, JSON.stringify(bought.data));
assert.equal(bought.data.total, 4.5);
pass("Valid published priced product purchasable at the server price");
const unpriced = await call(`/api/admin/products/${id}`, { method: "PATCH", admin: true, body: { ...draftBody, price: "", unit: "", isPublished: true, branchAvailability: { rockdale: true } } });
assert.equal(unpriced.status, 200);
assert.equal((await checkout(id)).status, 400);
const page = await call(`/products/${slug}`);
assert.equal(page.status, 200);
assert.match(page.data, /Price available in store/);
assert.match(page.data, /Enquire at Store/);
assert.doesNotMatch(page.data, /\$0\.00|application\/ld\+json/);
pass("Unpriced detail page shows enquiry state, no $0.00 and no Product/Offer JSON-LD");

// 6. Existing order records untouched.
assert.equal(await db.order.count(), ordersBefore + 1);
await db.product.delete({ where: { id } });
await db.$disconnect();
console.log(`\n${checks} catalogue integration checks passed`);
