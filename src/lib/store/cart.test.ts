import test from "node:test";
import assert from "node:assert/strict";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export function calculateCartTotals(items: CartItem[], deliveryFee: number) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = subtotal + deliveryFee;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

test("calculateCartTotals correctly aggregates items and delivery fee", () => {
  const items = [
    { id: "1", name: "Bananas", price: 3.49, qty: 2 },
    { id: "2", name: "Family Box", price: 44.99, qty: 1 }
  ];
  const totals = calculateCartTotals(items, 9.99);
  assert.equal(totals.subtotal, 51.97);
  assert.equal(totals.deliveryFee, 9.99);
  assert.equal(totals.total, 61.96);
});

test("calculateCartTotals handles empty cart", () => {
  const totals = calculateCartTotals([], 0);
  assert.equal(totals.subtotal, 0);
  assert.equal(totals.deliveryFee, 0);
  assert.equal(totals.total, 0);
});
