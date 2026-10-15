import test from "node:test";
import assert from "node:assert/strict";
import { effectivePrice, hasConfirmedPrice, isSellableOnline, validateProductInput, slugify } from "./product-commerce";
import { priceItems } from "./checkout-pricing";
import { cataloguePrice, sortCatalogue } from "./catalogue";

const BRANCHES = ["rockdale", "riverwood"];
const base = { name: "Fresh carrots", categoryId: "cat1", imageUrl: "/products/fresh-carrots.webp" };

test("unpriced, zero and invalid prices are never confirmed", () => {
  for (const price of [null, 0, -1, NaN, Infinity]) {
    assert.equal(hasConfirmedPrice({ price }), false);
    assert.equal(effectivePrice({ price }), null);
    assert.equal(isSellableOnline({ price, unit: "kg" }), false);
  }
  assert.equal(isSellableOnline({ price: 2, unit: "kg" }), true);
  assert.equal(isSellableOnline({ price: 2, unit: null }), false);
  assert.equal(isSellableOnline({ price: 2, unit: "kg", isPublished: false }), false);
});

test("a special price never makes an unpriced product priced", () => {
  assert.equal(effectivePrice({ price: null, isSpecial: true, specialPrice: 3 }), null);
  assert.equal(cataloguePrice({ price: null, isSpecial: true, specialPrice: 3 }), null);
});

test("checkout rejects unpriced and unpublished products even if the client sends a price", () => {
  const mk = (o: object) => ({ id: "a", name: "Carrots", price: null, unit: null, imageUrl: "/x.webp", isSpecial: false, specialPrice: null, ...o });
  const items = [{ id: "a", quantity: 1 }];
  const ids = new Set(["a"]);
  assert.equal(priceItems(items, [mk({})], ids).ok, false);
  assert.equal(priceItems(items, [mk({ price: 3, unit: null })], ids).ok, false);
  assert.equal(priceItems(items, [mk({ price: 3, unit: "kg", isPublished: false })], ids).ok, false);
  assert.equal(priceItems(items, [mk({ price: 3, unit: "kg" })], ids).ok, true);
});

test("unpriced products sort last in both price directions", () => {
  const list = [{ name: "B", price: null }, { name: "A", price: 5 }, { name: "C", price: 2 }];
  assert.deepEqual(sortCatalogue(list, "price-asc").map((p) => p.name), ["C", "A", "B"]);
  assert.deepEqual(sortCatalogue(list, "price-desc").map((p) => p.name), ["A", "C", "B"]);
});

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

test("admin validation: publishing a priced product needs a unit and an available branch", () => {
  assert.equal(validateProductInput({ ...base, price: 3, unit: "kg", isPublished: true }, BRANCHES).ok, false);
  assert.equal(validateProductInput({ ...base, price: 3, unit: "kg", isPublished: true, branchAvailability: { rockdale: false } }, BRANCHES).ok, false);
  assert.ok(validateProductInput({ ...base, price: 3, unit: "kg", isPublished: true, branchAvailability: { rockdale: true } }, BRANCHES).ok);
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
