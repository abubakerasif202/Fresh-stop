import test from "node:test";
import assert from "node:assert/strict";
import { validateProductInput, slugify, isApprovedPrice, resolveCompareAtPrice } from "./product-commerce";

const BRANCHES = ["rockdale", "riverwood"];
const base = { name: "Fresh carrots", categoryId: "cat1", imageUrl: "/products/fresh-carrots.webp" };
test("admin validation: unpriced draft is valid without unit or branches", () => {
  const r = validateProductInput(base, BRANCHES);
  assert.ok(r.ok);
  assert.equal(r.value.price, null);
  assert.equal(r.value.isPublished, false);
});

test("admin validation: entering a price alone never publishes and requires a unit", () => {
  const r = validateProductInput({ ...base, price: 3.5 }, BRANCHES);
  assert.equal(r.ok, false);
  const ok = validateProductInput({ ...base, price: 3.5, unit: "kg" }, BRANCHES);
  assert.ok(ok.ok);
  assert.equal(ok.value.isPublished, false);
});

test("admin validation: published catalogue products do not require branch stock", () => {
  assert.ok(validateProductInput({ ...base, isPublished: true }, BRANCHES).ok);
  assert.ok(validateProductInput({ ...base, price: 3, unit: "kg", isPublished: true }, BRANCHES).ok);
});
test("admin validation rejects bad prices, images, branches and units", () => {
  for (const price of [0, -2, 10001, "abc", 1.234]) assert.equal(validateProductInput({ ...base, price, unit: "kg" }, BRANCHES).ok, false, String(price));
  for (const imageUrl of ["https://evil.test/x.webp", "/products/../secret.webp", "/products/a.svg", ""]) assert.equal(validateProductInput({ ...base, imageUrl }, BRANCHES).ok, false, imageUrl);
  assert.equal(validateProductInput({ ...base, branchAvailability: { nowhere: true } }, BRANCHES).ok, false);
  assert.equal(validateProductInput({ ...base, price: 2, unit: "<script>" }, BRANCHES).ok, false);
  assert.equal(validateProductInput({ ...base, isPublished: "yes" }, BRANCHES).ok, false);
});

test("slugify is stable and URL-safe", () => {
  assert.equal(slugify("White radish (daikon)"), "white-radish-daikon");
});

test("isApprovedPrice requires APPROVED, a named approver and positive integer cents", () => {
  assert.equal(isApprovedPrice({ approvalStatus: "APPROVED", priceApprovedBy: "owner", priceCents: 100 }), true);
  for (const bad of [{ approvalStatus: "PENDING", priceApprovedBy: "o", priceCents: 100 }, { approvalStatus: "APPROVED", priceApprovedBy: "", priceCents: 100 }, { approvalStatus: "APPROVED", priceApprovedBy: "o", priceCents: 0 }, { approvalStatus: "APPROVED", priceApprovedBy: "o", priceCents: 1.5 }, { approvalStatus: "APPROVED", priceApprovedBy: "o", priceCents: null }]) assert.equal(isApprovedPrice(bad), false);
});

test("resolveCompareAtPrice defaults to hidden", () => {
  assert.equal(resolveCompareAtPrice({ price: 4, compareAtPrice: 6 }), null);
  assert.equal(resolveCompareAtPrice({ price: 4, compareAtPrice: 6, compareAtApproved: false }), null);
  assert.equal(resolveCompareAtPrice({ price: 4, compareAtPrice: 6, compareAtApproved: true }), 6);
  assert.equal(resolveCompareAtPrice({ price: null, compareAtPrice: 6, compareAtApproved: true }), null);
});
