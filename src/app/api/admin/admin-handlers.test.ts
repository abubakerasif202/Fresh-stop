import "@/lib/testing/local-db-env";
import test, { after, before, mock } from "node:test";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { cleanupTestData, createTestCategory, createTestOrder, createTestProduct, testPostcode, uniqueId } from "@/lib/testing/db-fixtures";
import { reserveStock } from "@/lib/inventory";
import { setEmailTransportForTests } from "@/lib/email";
import { PATCH as pricingPatch, GET as pricingGet } from "./pricing/route";
import { GET as exportCsv } from "./pricing/export/route";
import { POST as importCsv } from "./pricing/import/route";
import { PATCH as commercePatch } from "./products/[id]/commerce/route";
import { PATCH as cataloguePatch } from "./products/[id]/route";
import { POST as deliveryPost, PATCH as deliveryPatch, DELETE as deliveryDelete } from "./delivery/route";
import { PATCH as ordersPatch } from "./orders/route";
import { POST as paidCheckoutPost } from "./settings/paid-checkout/route";

const PASSWORD = "admin-handlers-test-password";
const ADMIN = "alice";
const AUTH = `Basic ${Buffer.from(`${ADMIN}:${PASSWORD}`).toString("base64")}`;

const productIds: string[] = [];
const orderIds: string[] = [];
const zoneIds: string[] = [];
let categoryId = "";
let branchSlug = "";
let previousEnv: Record<string, string | undefined> = {};

before(async () => {
  mock.method(createRequire(import.meta.url)("next/cache") as typeof import("next/cache"), "revalidatePath", () => {});
  previousEnv = { ADMIN_PASSWORD: process.env.ADMIN_PASSWORD, ADMIN_USER: process.env.ADMIN_USER, CATALOGUE_DATA_SOURCE: process.env.CATALOGUE_DATA_SOURCE };
  process.env.ADMIN_PASSWORD = PASSWORD;
  process.env.ADMIN_USER = ADMIN;
  delete process.env.CATALOGUE_DATA_SOURCE;
  categoryId = (await createTestCategory(db)).id;
  branchSlug = uniqueId("tbranch");
  await db.storeBranch.create({
    data: { name: branchSlug, slug: branchSlug, address: "1 Test St", suburb: "Testville", postcode: "2000", phone: "0200000000", email: "t@example.test", googleMapsUrl: "https://example.test", openingHours: "9-5" }
  });
});

after(async () => {
  mock.restoreAll();
  for (const [key, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const ids = [...productIds, ...orderIds, ...zoneIds];
  await db.adminAuditLog.deleteMany({ where: { entityId: { in: ids } } });
  await db.adminAuditLog.deleteMany({ where: { entityId: null, adminUser: ADMIN, action: "BULK_PRICE_APPROVED" } });
  await cleanupTestData(db, { orderIds, productIds, categoryIds: [categoryId], zoneIds });
  await db.storeBranch.deleteMany({ where: { slug: branchSlug } });
  await db.$disconnect();
});

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = { authorization: AUTH }) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) })
  });
}
const json = async (res: Response) => (await res.json()) as Record<string, unknown> & { error?: string };

async function pendingProduct(over: Record<string, unknown> = {}) {
  const p = await createTestProduct(db, categoryId, {
    isPurchasable: false, approvalStatus: "PENDING", priceApprovedBy: null, priceCents: null, priceSource: null,
    stockVerified: false, stockQuantity: null, suggestedPriceCents: 400, ...over
  });
  productIds.push(p.id);
  return p;
}
const approveBody = (p: { id: string; name: string }, price: string, cents: number, extra: Record<string, unknown> = {}) =>
  ({ action: "approve", productId: p.id, price, confirmedName: p.name, confirmedPriceCents: cents, ...extra });

test("CSV draft import previews without writes and saves audited drafts without changing approval or stock", async () => {
  const p = await pendingProduct({ priceCents: 400, price: 4, approvalStatus: "APPROVED", priceApprovedBy: ADMIN, stockVerified: true, stockQuantity: 8 });
  const csv = `Slug,Suggested Price AUD\n${p.slug},6.25`;
  const preview = await importCsv(req("POST", "/api/admin/pricing/import", { csv }));
  assert.equal(preview.status, 200);
  assert.equal((await preview.json()).saved, false);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).suggestedPriceCents, 400);
  const saved = await importCsv(req("POST", "/api/admin/pricing/import", { csv, confirmation: "SAVE 1 DRAFT PRICES" }));
  assert.equal(saved.status, 200);
  const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(after.suggestedPriceCents, 625);
  assert.equal(after.priceCents, 400);
  assert.equal(after.approvalStatus, "APPROVED");
  assert.equal(after.priceSource, p.priceSource);
  assert.equal(after.stockQuantity, 8);
  assert.equal(after.stockVerified, true);
  assert.equal(await db.adminAuditLog.count({ where: { entityId: p.id, action: "DRAFT_PRICE_IMPORTED", adminUser: ADMIN } }), 1);
});

test("CSV marks pending owner drafts and audits their provenance", async () => {
  const p = await pendingProduct();
  const csv = `Slug,Suggested Price AUD\n${p.slug},6.25`;
  assert.equal((await importCsv(req("POST", "/api/admin/pricing/import", { csv, confirmation: "SAVE 1 DRAFT PRICES" }))).status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).priceSource, "ADMIN_DRAFT");
  const audit = await db.adminAuditLog.findFirstOrThrow({ where: { entityId: p.id, action: "DRAFT_PRICE_IMPORTED" } });
  assert.equal(JSON.parse(audit.afterJson!).priceSource, "ADMIN_DRAFT");
});

test("CSV draft import fails atomically for missing slugs and rejects wrong confirmation, auth and origin", async () => {
  const p = await pendingProduct();
  const csv = `Slug,Suggested Price AUD\n${p.slug},6.25\nnonexistent-csv-product,2`;
  assert.equal((await importCsv(req("POST", "/api/admin/pricing/import", { csv, confirmation: "SAVE 2 DRAFT PRICES" }))).status, 422);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).suggestedPriceCents, 400);
  assert.equal((await importCsv(req("POST", "/api/admin/pricing/import", { csv, confirmation: "YES" }))).status, 422);
  assert.equal((await importCsv(req("POST", "/api/admin/pricing/import", { csv }, {}))).status, 401);
  assert.equal((await importCsv(req("POST", "/api/admin/pricing/import", { csv }, { authorization: AUTH, origin: "https://evil.example" }))).status, 403);
});

test("changing the selling unit revokes price and comparison approval before the product can sell", async () => {
  const p = await pendingProduct({ priceCents: 400, price: 4, approvalStatus: "APPROVED", priceApprovedBy: ADMIN, priceApprovedAt: new Date(), stockVerified: true, stockQuantity: 10, isPurchasable: true, compareAtApproved: true });
  const response = await cataloguePatch(req("PATCH", `/api/admin/products/${p.id}`, {
    name: p.name, categoryId, description: p.description, imageUrl: "/products/placeholder-produce.webp", unit: "box", isPublished: true
  }), { params: Promise.resolve({ id: p.id }) });
  assert.equal(response.status, 200);
  const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(after.approvalStatus, "PENDING");
  assert.equal(after.priceApprovedBy, null);
  assert.equal(after.isPurchasable, false);
  assert.equal(after.compareAtApproved, false);
});

test("a revised selling price requires comparison approval again", async () => {
  const p = await pendingProduct({ priceCents: 400, compareAtPriceCents: 600, compareAtApproved: true });
  const response = await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(p, "5.00", 500)));
  assert.equal(response.status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).compareAtApproved, false);
});

test("bulk approval rejects unsafe imported suggestions", async () => {
  const p = await pendingProduct({ suggestedPriceCents: 50_001 });
  const response = await pricingPatch(req("PATCH", "/api/admin/pricing", {
    action: "approve_selected", items: [{ productId: p.id, priceCents: 50_001 }], confirmation: "APPROVE 1 PRICES"
  }));
  assert.equal(response.status, 422);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).approvalStatus, "PENDING");
});

// ---------------------------------------------------------------- authentication, origin, size

test("every mutating admin handler rejects unauthenticated and wrongly authenticated requests with 401", async () => {
  const none = {};
  const wrong = { authorization: `Basic ${Buffer.from("alice:nope").toString("base64")}` };
  for (const headers of [none, wrong]) {
    const calls = [
      pricingPatch(req("PATCH", "/api/admin/pricing", {}, headers)),
      commercePatch(req("PATCH", "/api/admin/products/x/commerce", {}, headers), { params: Promise.resolve({ id: "x" }) }),
      deliveryPost(req("POST", "/api/admin/delivery", {}, headers)),
      deliveryPatch(req("PATCH", "/api/admin/delivery", {}, headers)),
      deliveryDelete(req("DELETE", "/api/admin/delivery", {}, headers)),
      ordersPatch(req("PATCH", "/api/admin/orders", {}, headers)),
      paidCheckoutPost(req("POST", "/api/admin/settings/paid-checkout", {}, headers)),
      pricingGet(req("GET", "/api/admin/pricing", undefined, headers)),
      exportCsv(req("GET", "/api/admin/pricing/export", undefined, headers))
    ];
    for (const res of await Promise.all(calls)) assert.equal(res.status, 401);
  }
});

test("admin handlers fail closed with 503 when ADMIN_PASSWORD is missing", async () => {
  delete process.env.ADMIN_PASSWORD;
  try {
    assert.equal((await pricingPatch(req("PATCH", "/api/admin/pricing", {}))).status, 503);
    assert.equal((await ordersPatch(req("PATCH", "/api/admin/orders", {}))).status, 503);
    assert.equal((await exportCsv(req("GET", "/api/admin/pricing/export"))).status, 503);
  } finally {
    process.env.ADMIN_PASSWORD = PASSWORD;
  }
});

test("cross-origin mutations are rejected with 403 and change nothing", async () => {
  const p = await pendingProduct();
  const evil = { authorization: AUTH, origin: "https://evil.example" };
  const res = await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(p, "4.00", 400), evil));
  assert.equal(res.status, 403);
  assert.equal((await ordersPatch(req("PATCH", "/api/admin/orders", {}, evil))).status, 403);
  assert.equal((await deliveryPost(req("POST", "/api/admin/delivery", {}, evil))).status, 403);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).approvalStatus, "PENDING");
});

test("oversized and malformed bodies are rejected", async () => {
  assert.equal((await pricingPatch(req("PATCH", "/api/admin/pricing", { pad: "x".repeat(40_000) }))).status, 413);
  assert.equal((await pricingPatch(req("PATCH", "/api/admin/pricing", "{broken"))).status, 400);
  assert.equal((await pricingPatch(req("PATCH", "/api/admin/pricing", []))).status, 400);
});

// ---------------------------------------------------------------- pricing

test("approving validates price, confirmation and unit", async () => {
  const p = await pendingProduct();
  const cases: [Record<string, unknown>, number][] = [
    [approveBody(p, "abc", 0), 422],
    [approveBody(p, "0", 0), 422],
    [approveBody(p, "500.01", 50001), 422],
    [approveBody(p, "4.00", 999), 422],
    [{ ...approveBody(p, "4.00", 400), confirmedName: "Other product" }, 422],
    [approveBody({ ...p, id: "does-not-exist" }, "4.00", 400), 404]
  ];
  for (const [body, status] of cases) assert.equal((await pricingPatch(req("PATCH", "/api/admin/pricing", body))).status, status, JSON.stringify(body).slice(0, 80));
  const noUnit = await pendingProduct({ unit: null });
  assert.equal((await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(noUnit, "4.00", 400)))).status, 422);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).approvalStatus, "PENDING");
});

test("approval sets approver fields, price history and an audit row together, and never makes the product purchasable", async () => {
  const p = await pendingProduct();
  const res = await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(p, "4.50", 450)));
  assert.equal(res.status, 200);
  const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(after.priceCents, 450);
  assert.equal(after.price, 4.5);
  assert.equal(after.approvalStatus, "APPROVED");
  assert.equal(after.priceApprovedBy, ADMIN);
  assert.equal(after.priceSource, "ADMIN");
  assert.ok(after.priceApprovedAt);
  assert.equal(after.isPurchasable, false);
  const history = await db.productPriceHistory.findMany({ where: { productId: p.id } });
  assert.equal(history.length, 1);
  assert.equal(history[0].newPriceCents, 450);
  assert.equal(history[0].changedBy, ADMIN);
  const audit = await db.adminAuditLog.findMany({ where: { entityId: p.id, action: "PRICE_APPROVED" } });
  assert.equal(audit.length, 1);
  assert.equal(audit[0].adminUser, ADMIN);
  assert.match(audit[0].beforeJson ?? "", /PENDING/);
  assert.match(audit[0].afterJson ?? "", /APPROVED/);
  assert.ok(!(audit[0].afterJson ?? "").includes(PASSWORD));
});

test("approval is atomic: a failing audit write rolls back the price and history", async () => {
  const p = await pendingProduct();
  const fn = uniqueId("fs_block").replace(/-/g, "_");
  await db.$executeRawUnsafe(`CREATE FUNCTION ${fn}() RETURNS trigger AS $$ BEGIN IF NEW."entityId" = '${p.id}' THEN RAISE EXCEPTION 'audit blocked'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await db.$executeRawUnsafe(`CREATE TRIGGER ${fn} BEFORE INSERT ON "AdminAuditLog" FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
  try {
    const quiet = console.error;
    console.error = () => {};
    const res = await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(p, "4.50", 450)));
    console.error = quiet;
    assert.equal(res.status, 500);
  } finally {
    await db.$executeRawUnsafe(`DROP TRIGGER ${fn} ON "AdminAuditLog"`);
    await db.$executeRawUnsafe(`DROP FUNCTION ${fn}()`);
  }
  const after = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.equal(after.approvalStatus, "PENDING");
  assert.equal(after.priceCents, null);
  assert.equal(await db.productPriceHistory.count({ where: { productId: p.id } }), 0);
});

test("products flagged needsReview require an explicit override with a reason", async () => {
  const { default: dataset } = await import("../../../data/sydney-pricing-dataset.json");
  // Review lookup supports source IDs as well as public slugs. Give this fixture
  // an unused source ID and a unique test slug, so a full catalogue can coexist.
  const entries = (dataset as { productId: string; needsReview: boolean }[]).filter((e) => e.needsReview);
  const existingIds = new Set((await db.product.findMany({ where: { id: { in: entries.map((e) => e.productId) } }, select: { id: true } })).map((p) => p.id));
  const source = entries.find((e) => !existingIds.has(e.productId));
  assert.ok(source, "an isolated source review ID is available");
  const flagged = await pendingProduct({ id: source.productId });
  const blocked = await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(flagged, "4.00", 400)));
  assert.equal(blocked.status, 422);
  assert.equal((await json(blocked)).code, "NEEDS_REVIEW");
  const shortReason = await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(flagged, "4.00", 400, { override: { reason: "ok" } })));
  assert.equal(shortReason.status, 422);
  const allowed = await pricingPatch(req("PATCH", "/api/admin/pricing", approveBody(flagged, "4.00", 400, { override: { reason: "Checked the pack size with the supplier" } })));
  assert.equal(allowed.status, 200);
  const audit = await db.adminAuditLog.findFirstOrThrow({ where: { entityId: flagged.id, action: "PRICE_APPROVED" } });
  assert.match(audit.afterJson ?? "", /Checked the pack size/);
});

test("unsafe bulk publish is rejected; bulk approval is limited, confirmed and per-item previewed", async () => {
  const legacy = await pricingPatch(req("PATCH", "/api/admin/pricing", { action: "bulk_approve" }));
  assert.equal(legacy.status, 400);
  assert.equal((await json(legacy)).code, "UNSAFE_BULK_REMOVED");

  const a = await pendingProduct(); const b = await pendingProduct();
  const items = [a, b].map((p) => ({ productId: p.id, priceCents: 400 }));
  const wrongPhrase = await pricingPatch(req("PATCH", "/api/admin/pricing", { action: "approve_selected", items, confirmation: "yes" }));
  assert.equal(wrongPhrase.status, 422);
  const tooMany = await pricingPatch(req("PATCH", "/api/admin/pricing", {
    action: "approve_selected", items: Array.from({ length: 11 }, (_, i) => ({ productId: `x${i}`, priceCents: 100 })), confirmation: "APPROVE 11 PRICES"
  }));
  assert.equal(tooMany.status, 422);
  assert.equal((await json(tooMany)).code, "BULK_LIMIT");
  const mismatch = await pricingPatch(req("PATCH", "/api/admin/pricing", {
    action: "approve_selected", items: [items[0], { productId: b.id, priceCents: 999 }], confirmation: "APPROVE 2 PRICES"
  }));
  assert.equal(mismatch.status, 422);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: a.id } })).approvalStatus, "PENDING", "all-or-nothing");

  const ok = await pricingPatch(req("PATCH", "/api/admin/pricing", { action: "approve_selected", items, confirmation: "APPROVE 2 PRICES" }));
  assert.equal(ok.status, 200);
  for (const p of [a, b]) {
    const row = await db.product.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(row.priceCents, 400);
    assert.equal(row.isPurchasable, false);
    assert.equal(await db.productPriceHistory.count({ where: { productId: p.id } }), 1);
  }
});

test("revoking an approval clears the approver and forces the product non-purchasable", async () => {
  const p = await createTestProduct(db, categoryId);
  productIds.push(p.id);
  const bad = await pricingPatch(req("PATCH", "/api/admin/pricing", { action: "revoke", productId: p.id, reason: "short" }));
  assert.equal(bad.status, 422);
  const ok = await pricingPatch(req("PATCH", "/api/admin/pricing", { action: "revoke", productId: p.id, reason: "Supplier price changed" }));
  assert.equal(ok.status, 200);
  const row = await db.product.findUniqueOrThrow({ where: { id: p.id } });
  assert.deepEqual([row.approvalStatus, row.priceApprovedBy, row.isPurchasable], ["PENDING", null, false]);
});

test("pricing list and CSV export never expose cost price, and CSV neutralises formulas", async () => {
  const p = await pendingProduct({ name: `=HYPERLINK("http://evil.test")-${uniqueId("n")}`, costPrice: 1.2345 });
  const list = await json(await pricingGet(req("GET", "/api/admin/pricing")));
  const row = (list.products as Record<string, unknown>[]).find((x) => x.id === p.id);
  assert.ok(row);
  assert.ok(!("costPrice" in row) && !("marketPrice" in row));
  assert.ok(!JSON.stringify(list).includes("1.2345"));
  const csv = await (await exportCsv(req("GET", "/api/admin/pricing/export"))).text();
  assert.ok(!/cost/i.test(csv.split("\r\n")[0]));
  assert.ok(!csv.includes("1.2345"));
  const line = csv.split("\r\n").find((l) => l.includes(p.id));
  assert.ok(line);
  assert.match(line, /'=HYPERLINK/);
  assert.ok(!/(^|,)"?=/.test(line), "no cell starts with =");
});

// ---------------------------------------------------------------- product commerce

const commerce = (id: string, body: Record<string, unknown>) =>
  commercePatch(req("PATCH", `/api/admin/products/${id}/commerce`, body), { params: Promise.resolve({ id }) });

test("setting a stock number never verifies it; verification is explicit and audited", async () => {
  const p = await pendingProduct();
  assert.equal((await commerce(p.id, { stockQuantity: 7 })).status, 200);
  assert.deepEqual(await db.product.findUniqueOrThrow({ where: { id: p.id }, select: { stockQuantity: true, stockVerified: true } }), { stockQuantity: 7, stockVerified: false });
  assert.equal((await commerce(p.id, { stockQuantity: 7, stockVerified: true })).status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stockVerified, true);
  assert.ok(await db.adminAuditLog.findFirst({ where: { entityId: p.id, action: "PRODUCT_COMMERCE_UPDATED", adminUser: ADMIN } }));
  assert.equal((await commerce(p.id, { stockQuantity: 8 })).status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).stockVerified, false, "a changed count must be re-verified");
});

test("commerce updates validate input, unknown fields and reserved stock", async () => {
  const p = await pendingProduct({ reservedQuantity: 3, stockQuantity: 10, stockVerified: true });
  for (const body of [{ stockQuantity: -1 }, { stockQuantity: 1.5 }, { maxOrderQuantity: 0 }, { availabilityStatus: "MAYBE" }, { stockVerified: "yes" }, { priceCents: 1 }, { stockQuantity: 2 }]) {
    assert.equal((await commerce(p.id, body)).status, 422, JSON.stringify(body));
  }
  assert.equal((await commerce(p.id, { stockQuantity: null, stockVerified: true })).status, 422);
  assert.equal((await commerce("missing-id", { stockQuantity: 1 })).status, 404);
});

test("the purchasable toggle is rejected with reasons when the product is ineligible", async () => {
  const p = await pendingProduct();
  const res = await commerce(p.id, { isPurchasable: true });
  assert.equal(res.status, 422);
  const reasons = (await json(res)).reasons as string[];
  assert.ok(reasons.length >= 1);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).isPurchasable, false);
});

test("the purchasable toggle works once price is approved and stock is verified, and edits that break eligibility switch it off", async () => {
  const p = await createTestProduct(db, categoryId, { isPurchasable: false });
  productIds.push(p.id);
  assert.equal((await commerce(p.id, { isPurchasable: true, availabilityStatus: "IN_STOCK" })).status, 200);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).isPurchasable, true);
  const res = await commerce(p.id, { stockVerified: false });
  assert.equal(res.status, 200);
  assert.equal((await json(res)).isPurchasable, false);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).isPurchasable, false);
});

// ---------------------------------------------------------------- delivery

const zoneBody = (over: Record<string, unknown> = {}) => ({ name: uniqueId("Zone"), postcodes: testPostcode(), primaryBranchSlug: branchSlug, ...over });
async function newZone(over: Record<string, unknown> = {}) {
  const res = await deliveryPost(req("POST", "/api/admin/delivery", zoneBody(over)));
  assert.equal(res.status, 201);
  const zone = (await json(res)).zone as { id: string };
  zoneIds.push(zone.id);
  return zone.id;
}

test("delivery zone input is validated", async () => {
  for (const over of [{ postcodes: "12a4" }, { postcodes: "" }, { deliveryFeeCents: 9.99 }, { deliveryFeeCents: -1 }, { primaryBranchSlug: "nope-branch" }, { orderCutoffHour: 24 }, { deliveryDays: "Funday" }]) {
    assert.equal((await deliveryPost(req("POST", "/api/admin/delivery", zoneBody(over)))).status, 422, JSON.stringify(over));
  }
});

test("zones start unapproved, write derived legacy floats, and approval needs a fee and a named admin", async () => {
  const id = await newZone();
  let zone = await db.deliveryZone.findUniqueOrThrow({ where: { id } });
  assert.deepEqual([zone.isApproved, zone.deliveryFeeCents], [false, null]);
  assert.equal((await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, action: "approve" }))).status, 422);
  assert.equal((await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, deliveryFeeCents: 950, freeDeliveryMinCents: 12000, minOrderCents: 3000 }))).status, 200);
  zone = await db.deliveryZone.findUniqueOrThrow({ where: { id } });
  assert.deepEqual([zone.deliveryFee, zone.freeDeliveryMinSpend, zone.minOrderAmount], [9.5, 120, 30]);
  assert.equal((await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, action: "approve" }))).status, 200);
  zone = await db.deliveryZone.findUniqueOrThrow({ where: { id } });
  assert.deepEqual([zone.isApproved, zone.approvedBy], [true, ADMIN]);
  assert.ok(zone.approvedAt);
});

test("editing money fields or postcodes resets approval; other edits keep it", async () => {
  const id = await newZone({ deliveryFeeCents: 500 });
  await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, action: "approve" }));
  assert.equal((await db.deliveryZone.findUniqueOrThrow({ where: { id } })).isApproved, true);

  const rename = await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, name: uniqueId("Renamed") }));
  assert.equal((await json(rename)).approvalReset, false);
  assert.equal((await db.deliveryZone.findUniqueOrThrow({ where: { id } })).isApproved, true);

  const same = await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, deliveryFeeCents: 500 }));
  assert.equal((await json(same)).approvalReset, false, "unchanged value is not an edit");

  for (const change of [{ deliveryFeeCents: 600 }, { freeDeliveryMinCents: 9000 }, { minOrderCents: 2500 }, { postcodes: testPostcode() }]) {
    await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, action: "approve" }));
    const res = await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, ...change }));
    assert.equal((await json(res)).approvalReset, true, JSON.stringify(change));
    const zone = await db.deliveryZone.findUniqueOrThrow({ where: { id } });
    assert.deepEqual([zone.isApproved, zone.approvedBy, zone.approvedAt], [false, null, null]);
  }
  assert.ok(await db.adminAuditLog.findFirst({ where: { entityId: id, action: "DELIVERY_ZONE_UPDATED_APPROVAL_RESET" } }));
});

test("a postcode cannot belong to two approved zones, and deletion is audited", async () => {
  const postcode = testPostcode();
  const first = await newZone({ postcodes: postcode, deliveryFeeCents: 500 });
  const second = await newZone({ postcodes: postcode, deliveryFeeCents: 500 });
  assert.equal((await deliveryPatch(req("PATCH", "/api/admin/delivery", { id: first, action: "approve" }))).status, 200);
  assert.equal((await deliveryPatch(req("PATCH", "/api/admin/delivery", { id: second, action: "approve" }))).status, 422);
  assert.equal((await deliveryDelete(req("DELETE", "/api/admin/delivery", { id: second }))).status, 200);
  assert.equal(await db.deliveryZone.count({ where: { id: second } }), 0);
  assert.ok(await db.adminAuditLog.findFirst({ where: { entityId: second, action: "DELIVERY_ZONE_DELETED" } }));
});

test("concurrent delivery approvals cannot approve overlapping postcodes", async () => {
  const postcode = testPostcode();
  const first = await newZone({ postcodes: postcode, deliveryFeeCents: 500 });
  const second = await newZone({ postcodes: postcode, deliveryFeeCents: 500 });
  const responses = await Promise.all([first, second].map((id) => deliveryPatch(req("PATCH", "/api/admin/delivery", { id, action: "approve" }))));
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 422]);
});

test("deactivating an approved delivery zone removes its approval before reactivation", async () => {
  const id = await newZone({ deliveryFeeCents: 500 });
  await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, action: "approve" }));
  const response = await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, isActive: false }));
  assert.equal((await json(response)).approvalReset, true);
  await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, isActive: true }));
  assert.equal((await db.deliveryZone.findUniqueOrThrow({ where: { id } })).isApproved, false);
});

test("delivery constraints cannot be approved until checkout supports their enforcement", async () => {
  for (const change of [{ deliveryDays: "Mon" }, { orderCutoffHour: 14 }, { maxDailyOrders: 10 }]) {
    const id = await newZone({ deliveryFeeCents: 500, ...change });
    const response = await deliveryPatch(req("PATCH", "/api/admin/delivery", { id, action: "approve" }));
    assert.equal(response.status, 422);
    assert.equal((await db.deliveryZone.findUniqueOrThrow({ where: { id } })).isApproved, false);
  }
});

// ---------------------------------------------------------------- paid checkout approval

test("paid checkout approval needs the typed phrase, is audited, and switching off needs none", async () => {
  const before = await db.deliverySetting.findUnique({ where: { key: "paidCheckoutApproved" } });
  try {
    const call = (body: unknown) => paidCheckoutPost(req("POST", "/api/admin/settings/paid-checkout", body));
    assert.equal((await call({ enabled: true })).status, 422);
    assert.equal((await call({ enabled: true, confirmation: "enable paid checkout" })).status, 422);
    assert.equal((await call({ enabled: "true", confirmation: "ENABLE PAID CHECKOUT" })).status, 422);
    assert.equal((await db.deliverySetting.findUnique({ where: { key: "paidCheckoutApproved" } }))?.value, before?.value);
    assert.equal((await call({ enabled: true, confirmation: "ENABLE PAID CHECKOUT" })).status, 200);
    assert.equal((await db.deliverySetting.findUniqueOrThrow({ where: { key: "paidCheckoutApproved" } })).value, "true");
    assert.equal((await call({ enabled: false })).status, 200);
    assert.equal((await db.deliverySetting.findUniqueOrThrow({ where: { key: "paidCheckoutApproved" } })).value, "false");
    assert.ok(await db.adminAuditLog.findFirst({ where: { action: "PAID_CHECKOUT_APPROVED", adminUser: ADMIN } }));
  } finally {
    if (before) await db.deliverySetting.update({ where: { key: "paidCheckoutApproved" }, data: { value: before.value } });
    else await db.deliverySetting.deleteMany({ where: { key: "paidCheckoutApproved" } });
  }
});

// ---------------------------------------------------------------- orders

const orderPatch = (body: Record<string, unknown>) => ordersPatch(req("PATCH", "/api/admin/orders", body));
async function newOrder(over: Record<string, unknown> = {}) {
  const o = await createTestOrder(db, over);
  orderIds.push(o.id);
  return o;
}

test("an admin cannot mark an order paid by hand", async () => {
  const o = await newOrder();
  assert.equal((await orderPatch({ orderId: o.id, paymentStatus: "PAID" })).status, 422);
  assert.equal((await orderPatch({ orderId: o.id, orderStatus: "PAID" })).status, 400);
  assert.equal((await orderPatch({ orderId: o.id, orderStatus: "PREPARING" })).status, 422, "unpaid order cannot enter fulfilment");
  assert.equal((await orderPatch({ orderId: o.id, orderStatus: "RECEIVED" })).status, 422);
  const row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
  assert.deepEqual([row.paymentStatus, row.orderStatus], ["PENDING", "PENDING_PAYMENT"]);
});

test("paid orders move through the validated chain with an audit row per step; invalid jumps are refused", async () => {
  const o = await newOrder({ paymentStatus: "PAID", orderStatus: "RECEIVED", fulfillmentType: "DELIVERY" });
  assert.equal((await orderPatch({ orderId: o.id, orderStatus: "READY" })).status, 422);
  for (const next of ["PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]) {
    assert.equal((await orderPatch({ orderId: o.id, orderStatus: next })).status, 200, next);
  }
  assert.equal((await orderPatch({ orderId: o.id, action: "cancel" })).status, 422, "no cancel after delivery");
  assert.equal(await db.adminAuditLog.count({ where: { entityId: o.id, action: "ORDER_STATUS_CHANGED" } }), 4);
  assert.equal((await orderPatch({ orderId: "missing", orderStatus: "PREPARING" })).status, 404);
});

test("cancelling an unpaid order releases its reservation in the same transaction", async () => {
  const p = await createTestProduct(db, categoryId, { stockQuantity: 5 });
  productIds.push(p.id);
  const o = await newOrder();
  await db.$transaction((tx) => reserveStock(tx, o.id, [{ productId: p.id, quantity: 2 }], 30));
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 2);
  const res = await orderPatch({ orderId: o.id, action: "cancel" });
  assert.equal(res.status, 200);
  assert.equal((await json(res)).refundRequired, false);
  const row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
  assert.deepEqual([row.orderStatus, row.paymentStatus], ["CANCELLED", "EXPIRED"]);
  assert.ok(row.cancelledAt);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id: p.id } })).reservedQuantity, 0);
  assert.equal((await db.inventoryReservation.findFirstOrThrow({ where: { orderId: o.id } })).status, "RELEASED");
  assert.equal(await db.adminAuditLog.count({ where: { entityId: o.id, action: "ORDER_CANCELLED" } }), 1);
});

test("cancelling a paid order flags that a manual refund is required and leaves payment status alone", async () => {
  const o = await newOrder({ paymentStatus: "PAID", orderStatus: "RECEIVED" });
  const res = await orderPatch({ orderId: o.id, action: "cancel" });
  assert.equal((await json(res)).refundRequired, true);
  const row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
  assert.deepEqual([row.orderStatus, row.paymentStatus], ["CANCELLED", "PAID"]);
});

test("resend emails works only for paid orders and records the outcome without addresses", async () => {
  const sent: string[] = [];
  setEmailTransportForTests(async (message) => { sent.push(message.subject); });
  try {
    const unpaid = await newOrder();
    assert.equal((await orderPatch({ orderId: unpaid.id, action: "resend_emails" })).status, 422);
    const paid = await newOrder({ paymentStatus: "PAID", orderStatus: "RECEIVED", paidAt: new Date() });
    const res = await orderPatch({ orderId: paid.id, action: "resend_emails" });
    assert.equal(res.status, 200);
    assert.equal(sent.length, 2);
    const audit = await db.adminAuditLog.findFirstOrThrow({ where: { entityId: paid.id, action: "ORDER_EMAILS_RESENT" } });
    assert.ok(!(audit.afterJson ?? "").includes("example.test"));
  } finally {
    setEmailTransportForTests(null);
  }
});

// ---------------------------------------------------------------- payment review

const flagRow = (orderId: string, action = "PAYMENT_FLAGGED") =>
  db.adminAuditLog.create({ data: { action, entityType: "Order", entityId: orderId, adminUser: "stripe-webhook", details: JSON.stringify({ eventId: "evt_x", reason: "AMOUNT_MISMATCH" }) } });

test("webhook payment flags appear for review and acknowledging removes them without touching payment state", async () => {
  const { loadPaymentReview, countPaymentReview } = await import("@/lib/admin-payment-review");
  const o = await newOrder({ paymentStatus: "PENDING", orderStatus: "PENDING_PAYMENT" });
  await flagRow(o.id);
  const shown = (await loadPaymentReview()).flags.find((f) => f.orderId === o.id);
  assert.ok(shown);
  assert.equal(shown.code, "AMOUNT_MISMATCH");
  assert.ok((await countPaymentReview()) >= 1);

  assert.equal((await orderPatch({ orderId: o.id, action: "acknowledge_payment", reason: "short" })).status, 422);
  assert.equal((await orderPatch({ orderId: o.id, action: "acknowledge_payment", reason: "Checked in Stripe, amount was a test", paymentStatus: "PAID" })).status, 422, "payment fields rejected");
  assert.ok((await loadPaymentReview()).flags.some((f) => f.orderId === o.id), "still open");

  assert.equal((await orderPatch({ orderId: o.id, action: "acknowledge_payment", reason: "Checked in Stripe, amount was a test" })).status, 200);
  assert.ok(!(await loadPaymentReview()).flags.some((f) => f.orderId === o.id));
  const row = await db.order.findUniqueOrThrow({ where: { id: o.id } });
  assert.deepEqual([row.paymentStatus, row.orderStatus, row.paidAt], ["PENDING", "PENDING_PAYMENT", null]);
  const ack = await db.adminAuditLog.findFirstOrThrow({ where: { entityId: o.id, action: "PAYMENT_REVIEW_ACKNOWLEDGED" } });
  assert.equal(ack.adminUser, ADMIN);

  await new Promise((r) => setTimeout(r, 5));
  await flagRow(o.id, "PAYMENT_NEEDS_REVIEW");
  assert.ok((await loadPaymentReview()).flags.some((f) => f.orderId === o.id), "a newer flag reopens review");
});

test("acknowledge needs an existing flag and an existing order; failed payment events show reason codes only", async () => {
  const { loadPaymentReview } = await import("@/lib/admin-payment-review");
  const clean = await newOrder();
  assert.equal((await orderPatch({ orderId: clean.id, action: "acknowledge_payment", reason: "Nothing to see here really" })).status, 422);
  assert.equal((await orderPatch({ orderId: "missing", action: "acknowledge_payment", reason: "Nothing to see here really" })).status, 404);
  const ev = await db.paymentEvent.create({ data: { stripeEventId: uniqueId("evt_t"), eventType: "checkout.session.completed", status: "FAILED", lastError: "AMOUNT_MISMATCH: customer@example.test" } });
  try {
    const found = (await loadPaymentReview()).failedEvents.find((e) => e.id === ev.id);
    assert.equal(found?.code, "AMOUNT_MISMATCH");
    assert.ok(!JSON.stringify(found).includes("example.test"));
  } finally {
    await db.paymentEvent.delete({ where: { id: ev.id } });
  }
});
