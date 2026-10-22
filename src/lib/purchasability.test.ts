import test from "node:test";
import assert from "node:assert/strict";
import { getPurchasabilityReason, isProductPurchasable, type PurchasabilityFields } from "./purchasability";

const good: PurchasabilityFields = {
  isPublished: true,
  isActive: true,
  isPurchasable: true,
  approvalStatus: "APPROVED",
  priceApprovedBy: "owner@example.test",
  priceCents: 450,
  taxCategory: "GST_FREE",
  taxCategoryApprovedBy: "owner@example.test",
  taxCategoryApprovedAt: new Date("2026-10-21T00:00:00Z"),
  stockVerified: true,
  stockQuantity: 10,
  reservedQuantity: 2,
  availabilityStatus: "IN_STOCK"
};

test("a fully approved, verified, in-stock product is purchasable up to available stock", () => {
  assert.equal(isProductPurchasable(good, 8), true);
  assert.equal(getPurchasabilityReason(good, 9), "INSUFFICIENT_STOCK");
});

const cases: Array<[string, Partial<PurchasabilityFields>, string]> = [
  ["unpublished", { isPublished: false }, "NOT_PUBLISHED"],
  ["inactive", { isActive: false }, "NOT_ACTIVE"],
  ["flag off", { isPurchasable: false }, "NOT_PURCHASABLE"],
  ["pending approval", { approvalStatus: "PENDING" }, "NOT_APPROVED"],
  ["rejected approval", { approvalStatus: "REJECTED" }, "NOT_APPROVED"],
  ["no approver", { priceApprovedBy: null }, "PRICE_NOT_APPROVED"],
  ["blank approver", { priceApprovedBy: "  " }, "PRICE_NOT_APPROVED"],
  ["null price", { priceCents: null }, "PRICE_INVALID"],
  ["zero price", { priceCents: 0 }, "PRICE_INVALID"],
  ["fractional price", { priceCents: 4.5 }, "PRICE_INVALID"],
  ["unapproved tax category", { taxCategoryApprovedBy: null }, "TAX_NOT_APPROVED"],
  ["tax category missing approval timestamp", { taxCategoryApprovedAt: null }, "TAX_NOT_APPROVED"],
  ["unknown tax category", { taxCategory: "UNKNOWN" }, "TAX_NOT_APPROVED"],
  ["stock unverified", { stockVerified: false }, "STOCK_UNVERIFIED"],
  ["unknown stock", { stockQuantity: null }, "STOCK_UNKNOWN"],
  ["flagged out of stock", { availabilityStatus: "OUT_OF_STOCK" }, "OUT_OF_STOCK"],
  ["fully reserved", { stockQuantity: 2, reservedQuantity: 2 }, "OUT_OF_STOCK"]
];

for (const [name, patch, reason] of cases) {
  test(`product is rejected when ${name}`, () => {
    const product = { ...good, ...patch };
    assert.equal(getPurchasabilityReason(product), reason);
    assert.equal(isProductPurchasable(product), false);
  });
}

test("non-positive or fractional quantities are never purchasable", () => {
  assert.equal(isProductPurchasable(good, 0), false);
  assert.equal(isProductPurchasable(good, -1), false);
  assert.equal(isProductPurchasable(good, 1.5), false);
});
