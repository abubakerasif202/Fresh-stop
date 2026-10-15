import { test } from "node:test";
import assert from "node:assert/strict";
import { checkoutOrderId, sameCheckoutRequest, type CheckoutRequestInput } from "./checkout-idempotency";

test("checkout keys are validated, opaque and stable across retries", () => {
  const previous = process.env.ORDER_TOKEN_SECRET;
  process.env.ORDER_TOKEN_SECRET = "test-checkout-secret-at-least-16";
  try {
    const key = "c5acba27-5fa4-4546-8f47-9bc011671c81";
    const id = checkoutOrderId(key);
    assert.ok(id?.startsWith("checkout_"));
    assert.equal(id, checkoutOrderId(key.toUpperCase()));
    assert.notEqual(id, checkoutOrderId("c5acba27-5fa4-4546-8f47-9bc011671c82"));
    assert.equal(checkoutOrderId("invalid"), null);
    assert.equal(checkoutOrderId(null), null);
    delete process.env.ORDER_TOKEN_SECRET;
    assert.equal(checkoutOrderId(key), null);
  } finally {
    if (previous === undefined) delete process.env.ORDER_TOKEN_SECRET;
    else process.env.ORDER_TOKEN_SECRET = previous;
  }
});

test("replays compare original inputs despite expired slots and changed catalogue prices", () => {
  const request: CheckoutRequestInput = {
    customerName: "Test Shopper", customerEmail: "shopper@example.test", customerPhone: "0400000000",
    deliveryAddress: "", deliveryPostcode: "", deliveryNotes: "", pickupTimeslot: "2000-01-01T09:00",
    fulfillmentType: "PICKUP", branchSlug: "rockdale", paymentMethod: "PAY_ON_PICKUP", items: [{ id: "apple", quantity: 2 }]
  };
  const existing = { ...request, deliveryAddress: null, deliveryPostcode: null, deliveryNotes: null,
    storeBranch: { slug: "rockdale" }, itemsJson: JSON.stringify([{ id: "apple", quantity: 2, price: 12 }]),
    total: 24, paymentStatus: "PENDING", orderStatus: "COMPLETED" };
  assert.equal(sameCheckoutRequest(existing, request), true);
  const changedTotal = { ...existing, total: 100 };
  assert.equal(sameCheckoutRequest(changedTotal, request), true);
  assert.equal(sameCheckoutRequest(existing, { ...request, customerEmail: "other@example.test" }), false);
  assert.equal(sameCheckoutRequest(existing, { ...request, items: [{ id: "apple", quantity: 3 }] }), false);
  assert.equal(sameCheckoutRequest(existing, { ...request, branchSlug: "riverwood" }), false);
  assert.equal(sameCheckoutRequest(existing, { ...request, pickupTimeslot: "2000-01-02T09:00" }), false);
  assert.equal(sameCheckoutRequest({ ...existing, itemsJson: "invalid" }, request), false);
});
