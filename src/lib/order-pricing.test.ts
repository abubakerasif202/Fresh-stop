import "./testing/local-db-env";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import { DEFAULT_MAX_LINE_QUANTITY, gstFromInclusiveCents, validateAndPriceOrder, type PricingClient } from "./order-pricing";
import { cleanupTestData, createTestCategory, createTestProduct, createTestZone, testPostcode } from "./testing/db-fixtures";

const productIds: string[] = [];
const zoneIds: string[] = [];
let categoryId = "";
let postcode = "";

before(async () => {
  categoryId = (await createTestCategory(db)).id;
  postcode = testPostcode();
  zoneIds.push((await createTestZone(db, postcode)).id);
});

after(async () => {
  await cleanupTestData(db, { productIds, categoryIds: [categoryId], zoneIds });
  await db.$disconnect();
});

async function product(overrides: Record<string, unknown> = {}) {
  const created = await createTestProduct(db, categoryId, overrides);
  productIds.push(created.id);
  return created;
}

function pickup(items: unknown) {
  return validateAndPriceOrder(items, undefined, "PICKUP", db);
}

test("an empty or malformed basket is a 400", async () => {
  for (const bad of [[], null, undefined, "x", [{ quantity: 1 }]]) {
    const res = await pickup(bad);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.status, 400);
  }
});

test("quantities must be positive whole numbers and lines may not repeat", async () => {
  const p = await product();
  for (const quantity of [-2, 0, 1.5, Number.NaN]) {
    const res = await pickup([{ productId: p.id, quantity }]);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.status, 400);
      assert.match(res.error, /invalid quantity/i);
    }
  }
  const dup = await pickup([{ productId: p.id, quantity: 1 }, { productId: p.id, quantity: 1 }]);
  assert.equal(dup.ok, false);
  if (!dup.ok) assert.equal(dup.status, 400);

  const slugAndId = await pickup([{ productId: p.id, quantity: 1 }, { slug: p.slug, quantity: 1 }]);
  assert.equal(slugAndId.ok, false);
  if (!slugAndId.ok) assert.equal(slugAndId.conflicts?.[0].reason, "DUPLICATE_PRODUCT");
});

test("price tampering: client-sent price fields are ignored and the database price is charged", async () => {
  const p = await product({ priceCents: 1234 });
  const res = await pickup([{ productId: p.id, quantity: 3, price: 0.01, priceCents: 1, unitPrice: 0 }]);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.items[0].priceCents, 1234);
    assert.equal(res.items[0].totalCents, 3702);
    assert.equal(res.subtotalCents, 3702);
    assert.equal(res.totalCents, 3702);
    assert.equal(res.currency, "aud");
  }
});

test("slug lookup works and totals are integer cents", async () => {
  const p = await product({ priceCents: 399 });
  const res = await pickup([{ slug: p.slug, quantity: 2 }]);
  assert.equal(res.ok, true);
  if (res.ok) {
    for (const value of [res.subtotalCents, res.gstTotalCents, res.deliveryFeeCents, res.totalCents, res.items[0].priceCents]) {
      assert.ok(Number.isInteger(value));
    }
  }
});

const unpurchasable: Array<[string, Record<string, unknown>, string]> = [
  ["pending approval", { approvalStatus: "PENDING" }, "NOT_APPROVED"],
  ["no price approver", { priceApprovedBy: null }, "PRICE_NOT_APPROVED"],
  ["unknown stock", { stockQuantity: null }, "STOCK_UNKNOWN"],
  ["stock not verified", { stockVerified: false }, "STOCK_UNVERIFIED"],
  ["not purchasable flag", { isPurchasable: false }, "NOT_PURCHASABLE"],
  ["unpublished", { isPublished: false }, "NOT_PUBLISHED"],
  ["no integer price (float price only)", { priceCents: null, price: 5.5 }, "PRICE_INVALID"],
  ["zero price", { priceCents: 0 }, "PRICE_INVALID"]
];

for (const [name, overrides, reason] of unpurchasable) {
  test(`a product that is ${name} is rejected with a 409 conflict`, async () => {
    const p = await product(overrides);
    const res = await pickup([{ productId: p.id, quantity: 1 }]);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.status, 409);
      assert.deepEqual(res.conflicts?.map((c) => [c.productId, c.reason]), [[p.id, reason]]);
    }
  });
}

test("unknown products are a conflict, not a fallback to bundled data", async () => {
  const res = await pickup([{ slug: "cavendish-bananas-1kg-does-not-exist-in-test", quantity: 1 }]);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 409);
    assert.equal(res.conflicts?.[0].reason, "NOT_FOUND");
  }
});

test("insufficient stock accounts for reservations and reports what is available", async () => {
  const p = await product({ stockQuantity: 5, reservedQuantity: 3 });
  const res = await pickup([{ productId: p.id, quantity: 3 }]);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 409);
    assert.deepEqual(res.conflicts?.[0], { productId: p.id, reason: "INSUFFICIENT_STOCK", available: 2 });
  }
  const ok = await pickup([{ productId: p.id, quantity: 2 }]);
  assert.equal(ok.ok, true);
});

test("per-line quantity limits: product limit when set, documented safety cap otherwise", async () => {
  const capped = await product({ maxOrderQuantity: 3, stockQuantity: 100 });
  const overCapped = await pickup([{ productId: capped.id, quantity: 4 }]);
  assert.equal(overCapped.ok, false);
  if (!overCapped.ok) assert.deepEqual(overCapped.conflicts?.[0], { productId: capped.id, reason: "QUANTITY_EXCEEDS_LIMIT", maxQuantity: 3 });

  const uncapped = await product({ stockQuantity: 500 });
  const atCap = await pickup([{ productId: uncapped.id, quantity: DEFAULT_MAX_LINE_QUANTITY }]);
  assert.equal(atCap.ok, true);
  const overCap = await pickup([{ productId: uncapped.id, quantity: DEFAULT_MAX_LINE_QUANTITY + 1 }]);
  assert.equal(overCap.ok, false);
  if (!overCap.ok) assert.equal(overCap.conflicts?.[0].maxQuantity, DEFAULT_MAX_LINE_QUANTITY);
});

test("stale price: an expectedPriceCents that no longer matches is a 409, but is never used to price", async () => {
  const p = await product({ priceCents: 800 });
  const stale = await pickup([{ productId: p.id, quantity: 1, expectedPriceCents: 700 }]);
  assert.equal(stale.ok, false);
  if (!stale.ok) {
    assert.equal(stale.status, 409);
    assert.equal(stale.conflicts?.[0].reason, "PRICE_CHANGED");
  }
  const fresh = await pickup([{ productId: p.id, quantity: 1, expectedPriceCents: 800 }]);
  assert.equal(fresh.ok, true);
});

test("one stale line fails the whole order and every conflict is listed", async () => {
  const good = await product();
  const pending = await product({ approvalStatus: "PENDING" });
  const scarce = await product({ stockQuantity: 1 });
  const res = await pickup([
    { productId: good.id, quantity: 1 },
    { productId: pending.id, quantity: 1 },
    { productId: scarce.id, quantity: 2 }
  ]);
  assert.equal(res.ok, false);
  if (!res.ok) assert.deepEqual(res.conflicts?.map((c) => c.reason).sort(), ["INSUFFICIENT_STOCK", "NOT_APPROVED"]);
});

test("GST: 1/11th of the GST-inclusive line, rounded half-up; GST-free lines carry none", () => {
  assert.equal(gstFromInclusiveCents(0), 0);
  assert.equal(gstFromInclusiveCents(1), 0);
  assert.equal(gstFromInclusiveCents(5), 0);
  assert.equal(gstFromInclusiveCents(6), 1);
  assert.equal(gstFromInclusiveCents(100), 9);
  assert.equal(gstFromInclusiveCents(105), 10);
  assert.equal(gstFromInclusiveCents(110), 10);
  assert.equal(gstFromInclusiveCents(333), 30);
  assert.equal(gstFromInclusiveCents(1099), 100);
});

test("GST is computed per line from the integer line total and summed", async () => {
  const taxable = await product({ priceCents: 335, taxCategory: "TAXABLE_10" });
  const free = await product({ priceCents: 400, taxCategory: "GST_FREE" });
  const res = await pickup([{ productId: taxable.id, quantity: 3 }, { productId: free.id, quantity: 2 }]);
  assert.equal(res.ok, true);
  if (res.ok) {
    const t = res.items.find((i) => i.productId === taxable.id);
    const f = res.items.find((i) => i.productId === free.id);
    assert.equal(t?.totalCents, 1005);
    assert.equal(t?.taxCents, Math.round(1005 / 11));
    assert.equal(f?.taxCents, 0);
    assert.equal(res.gstTotalCents, t?.taxCents);
    assert.equal(res.subtotalCents, 1005 + 800);
  }
});

test("an unknown tax category is rejected, never defaulted", async () => {
  const p = await product({ taxCategory: "SOMETHING_ELSE" });
  const res = await pickup([{ productId: p.id, quantity: 1 }]);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.conflicts?.[0].reason, "TAX_NOT_APPROVED");
});

test("delivery: no approved zone for the postcode means not eligible, with no invented fee", async () => {
  const p = await product();
  const res = await validateAndPriceOrder([{ productId: p.id, quantity: 1 }], "7000", "DELIVERY", db);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 400);
    assert.equal(res.code, "DELIVERY_UNAVAILABLE");
    assert.doesNotMatch(res.error, /\$\d/);
  }
});

test("delivery: an unapproved zone, or one without a fee, is ignored", async () => {
  const p = await product();
  const unapproved = testPostcode();
  const noFee = testPostcode();
  zoneIds.push((await createTestZone(db, unapproved, { isApproved: false })).id);
  zoneIds.push((await createTestZone(db, noFee, { deliveryFeeCents: null })).id);
  for (const code of [unapproved, noFee]) {
    const res = await validateAndPriceOrder([{ productId: p.id, quantity: 1 }], code, "DELIVERY", db);
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal(res.code, "DELIVERY_UNAVAILABLE");
  }
});

test("delivery: approved zone fee applies, and is waived at the approved free-delivery threshold", async () => {
  const p = await product({ priceCents: 1000, stockQuantity: 100 });
  const small = await validateAndPriceOrder([{ productId: p.id, quantity: 2 }], postcode, "DELIVERY", db);
  assert.equal(small.ok, true);
  if (small.ok) {
    assert.equal(small.deliveryFeeCents, 700);
    assert.equal(small.totalCents, 2700);
    assert.ok(small.zoneName);
  }
  const big = await validateAndPriceOrder([{ productId: p.id, quantity: 5 }], postcode, "DELIVERY", db);
  assert.equal(big.ok, true);
  if (big.ok) {
    assert.equal(big.deliveryFeeCents, 0);
    assert.equal(big.totalCents, 5000);
  }
});

test("delivery: a zone with no free-delivery threshold never waives the fee, and null min order is not enforced", async () => {
  const code = testPostcode();
  zoneIds.push((await createTestZone(db, code, { freeDeliveryMinCents: null, minOrderCents: null })).id);
  const p = await product({ priceCents: 9000, stockQuantity: 100 });
  const res = await validateAndPriceOrder([{ productId: p.id, quantity: 10 }], code, "DELIVERY", db);
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.deliveryFeeCents, 700);
});

test("delivery: an approved minimum order is enforced and nothing is enforced when it is unset", async () => {
  const code = testPostcode();
  zoneIds.push((await createTestZone(db, code, { minOrderCents: 2000 })).id);
  const p = await product({ priceCents: 1000, stockQuantity: 100 });
  const below = await validateAndPriceOrder([{ productId: p.id, quantity: 1 }], code, "DELIVERY", db);
  assert.equal(below.ok, false);
  if (!below.ok) {
    assert.equal(below.status, 400);
    assert.equal(below.code, "BELOW_MIN_ORDER");
    assert.match(below.error, /\$20\.00/);
  }
  const at = await validateAndPriceOrder([{ productId: p.id, quantity: 2 }], code, "DELIVERY", db);
  assert.equal(at.ok, true);
  const tiny = await pickup([{ productId: (await product({ priceCents: 100 })).id, quantity: 1 }]);
  assert.equal(tiny.ok, true, "pickup has no minimum unless an approved setting exists");
});

test("delivery requires a postcode, and fulfilment must be DELIVERY or PICKUP", async () => {
  const p = await product();
  const none = await validateAndPriceOrder([{ productId: p.id, quantity: 1 }], undefined, "DELIVERY", db);
  assert.equal(none.ok, false);
  const weird = await validateAndPriceOrder([{ productId: p.id, quantity: 1 }], postcode, "TELEPORT", db);
  assert.equal(weird.ok, false);
});

function fakeSettingClient(value: string | null): PricingClient {
  return {
    product: db.product,
    deliveryZone: db.deliveryZone,
    deliverySetting: { findUnique: async () => (value === null ? null : { id: "x", key: "pickupMinOrderCents", value, updatedAt: new Date() }) }
  } as unknown as PricingClient;
}

test("pickup minimum applies only when an approved setting exists", async () => {
  const p = await product({ priceCents: 1000 });
  const line = [{ productId: p.id, quantity: 1 }];
  const withMin = await validateAndPriceOrder(line, undefined, "PICKUP", fakeSettingClient("3000"));
  assert.equal(withMin.ok, false);
  if (!withMin.ok) assert.equal(withMin.code, "BELOW_MIN_ORDER");
  assert.equal((await validateAndPriceOrder(line, undefined, "PICKUP", fakeSettingClient(null))).ok, true);
  assert.equal((await validateAndPriceOrder(line, undefined, "PICKUP", fakeSettingClient("not-a-number"))).ok, true);
});

test("a database outage fails closed with 503 DB_UNAVAILABLE and never falls back to bundled data", async () => {
  const broken = {
    product: { findMany: async () => { throw new Error("connection refused"); } },
    deliveryZone: db.deliveryZone,
    deliverySetting: db.deliverySetting
  } as unknown as PricingClient;
  const res = await validateAndPriceOrder([{ slug: "cavendish-bananas-1kg", quantity: 1 }], postcode, "DELIVERY", broken);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.equal(res.status, 503);
    assert.equal(res.code, "DB_UNAVAILABLE");
    assert.doesNotMatch(res.error, /connection refused/);
  }
});

test("a delivery-zone lookup failure also fails closed with 503", async () => {
  const p = await product();
  const brokenZones = {
    product: db.product,
    deliveryZone: { findMany: async () => { throw new Error("boom"); } },
    deliverySetting: db.deliverySetting
  } as unknown as PricingClient;
  const res = await validateAndPriceOrder([{ productId: p.id, quantity: 1 }], postcode, "DELIVERY", brokenZones);
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.status, 503);
});
