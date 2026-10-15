import test from "node:test";
import assert from "node:assert/strict";
import { useCartStore, selectCartCount, selectCartSubtotal, selectCartTotal } from "./useCartStore";
import { useBranchStore, BRANCHES } from "./useBranchStore";

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

test("useCartStore handles adding items and updating quantities", () => {
  useCartStore.getState().clearCart();

  const product1 = {
    id: "p1",
    name: "Australian Cavendish Bananas",
    slug: "bananas",
    price: 3.49,
    unit: "kg",
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e"
  };

  useCartStore.getState().addItem(product1, 2);
  assert.equal(useCartStore.getState().items.length, 1);
  assert.equal(useCartStore.getState().items[0].quantity, 2);
  assert.equal(useCartStore.getState().getSubtotal(), 6.98);
  assert.equal(selectCartCount(useCartStore.getState()), 2);

  // Adding same product increments quantity
  useCartStore.getState().addItem(product1, 1);
  assert.equal(useCartStore.getState().items[0].quantity, 3);
  assert.equal(useCartStore.getState().getSubtotal(), 10.47);

  // Updating quantity
  useCartStore.getState().updateQuantity("p1", 5);
  assert.equal(useCartStore.getState().items[0].quantity, 5);

  // Updating quantity to 0 removes item
  useCartStore.getState().updateQuantity("p1", 0);
  assert.equal(useCartStore.getState().items.length, 0);
});

test("useCartStore calculates fulfillment totals and delivery fees", () => {
  useCartStore.getState().clearCart();

  const product2 = {
    id: "p2",
    name: "Fresh Stop Family Essentials Box",
    slug: "family-box",
    price: 45.0,
    unit: "box",
    imageUrl: "https://images.unsplash.com/photo-1610348725531-843dff563e2c"
  };

  useCartStore.getState().addItem(product2, 1);
  useCartStore.getState().setFulfillmentType("PICKUP");
  assert.equal(useCartStore.getState().getTotal(), 45.0);

  // Switch to Delivery with fee
  useCartStore.getState().setFulfillmentType("DELIVERY");
  useCartStore.getState().setDeliveryPostcode("2216", 9.99);
  assert.equal(useCartStore.getState().getTotal(), 54.99);
  assert.equal(selectCartTotal(useCartStore.getState()), 54.99);
});

test("useBranchStore switches branches and preserves store integrity", () => {
  assert.equal(useBranchStore.getState().currentBranch.slug, "rockdale");

  useBranchStore.getState().setBranch("riverwood");
  assert.equal(useBranchStore.getState().currentBranch.slug, "riverwood");
  assert.equal(useBranchStore.getState().currentBranch.address, "319 Belmore Rd");
  assert.equal(useBranchStore.getState().currentBranch.phone, "(02) 9534 8822");

  // Reset back to rockdale
  useBranchStore.getState().setBranch("rockdale");
  assert.equal(useBranchStore.getState().currentBranch.slug, "rockdale");
  assert.equal(useBranchStore.getState().currentBranch.address, "Shop 1, 2-4 King Street");
});
