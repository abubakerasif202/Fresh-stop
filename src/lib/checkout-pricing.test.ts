import test from "node:test";
import assert from "node:assert/strict";
import {
  parseRequestedItems,
  priceItems,
  quoteDelivery,
  resolvePaymentMethod,
  isValidEmail,
  unitPrice,
  type PricedProduct
} from "./checkout-pricing";

const mk = (o: Partial<PricedProduct> & { id: string }): PricedProduct => ({
  name: o.id,
  price: 10,
  unit: "kg",
  imageUrl: "/x.jpg",
  isSpecial: false,
  specialPrice: null,
  ...o
});

test("unitPrice uses special price only when flagged and set", () => {
  assert.equal(unitPrice(mk({ id: "a", price: 10, isSpecial: true, specialPrice: 7.5 })), 7.5);
  assert.equal(unitPrice(mk({ id: "a", price: 10, isSpecial: false, specialPrice: 7.5 })), 10);
  assert.equal(unitPrice(mk({ id: "a", price: 10, isSpecial: true, specialPrice: null })), 10);
});

test("priceItems ignores client price and computes subtotal from DB", () => {
  const parsed = parseRequestedItems([{ id: "a", quantity: 2, price: 0.01, name: "hack" }]);
  assert.ok(parsed.ok);
  const r = priceItems(
    parsed.items,
    [mk({ id: "a", name: "Apple", price: 10, isSpecial: true, specialPrice: 8 })],
    new Set(["a"])
  );
  assert.ok(r.ok);
  assert.equal(r.subtotal, 16);
  assert.equal(r.lines[0].name, "Apple");
  assert.equal(r.lines[0].price, 8);
});

test("priceItems rejects unknown and unavailable products", () => {
  const items = [{ id: "a", quantity: 1 }];
  assert.equal(priceItems(items, [], new Set(["a"])).ok, false);
  assert.equal(priceItems(items, [mk({ id: "a" })], new Set()).ok, false);
});

test("parseRequestedItems rejects bad quantities", () => {
  for (const q of [0, -1, 1.5, 100, "2", NaN, null]) {
    assert.equal(parseRequestedItems([{ id: "a", quantity: q }]).ok, false, String(q));
  }
  assert.equal(parseRequestedItems([{ id: "a", quantity: 99 }]).ok, true);
  assert.equal(parseRequestedItems([]).ok, false);
  assert.equal(parseRequestedItems("x").ok, false);
});

test("parseRequestedItems merges duplicates and caps total", () => {
  const r = parseRequestedItems([
    { id: "a", quantity: 2 },
    { id: "a", quantity: 3 }
  ]);
  assert.ok(r.ok);
  assert.deepEqual(r.items, [{ id: "a", quantity: 5 }]);
  assert.equal(
    parseRequestedItems([
      { id: "a", quantity: 60 },
      { id: "a", quantity: 60 }
    ]).ok,
    false
  );
});

test("delivery threshold boundaries", () => {
  assert.equal(quoteDelivery("2216", 49.99).ok, false);
  const min = quoteDelivery("2216", 50);
  assert.ok(min.ok);
  assert.equal(min.deliveryFee, 9.99);
  const justUnder = quoteDelivery("2216", 149.99);
  assert.ok(justUnder.ok);
  assert.equal(justUnder.deliveryFee, 9.99);
  const free = quoteDelivery("2216", 150);
  assert.ok(free.ok);
  assert.equal(free.deliveryFee, 0);
  assert.equal(quoteDelivery("9999", 200).ok, false);
});

test("payment: STRIPE rejected, pay on pickup accepted", () => {
  const s = resolvePaymentMethod("STRIPE");
  assert.equal(s.ok, false);
  assert.equal(!s.ok && s.error, "Card payments are not available online yet.");
  assert.equal(resolvePaymentMethod("PAY_ON_PICKUP").ok, true);
  assert.equal(resolvePaymentMethod(undefined).ok, true);
  assert.equal(resolvePaymentMethod("BITCOIN").ok, false);
});

test("isValidEmail", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  assert.equal(isValidEmail("nope"), false);
  assert.equal(isValidEmail("a b@c.d"), false);
});
