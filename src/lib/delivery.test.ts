import test from "node:test";
import assert from "node:assert/strict";
import {
  checkDeliveryEligibility,
  MIN_ORDER_AMOUNT,
  FREE_DELIVERY_THRESHOLD,
  STANDARD_DELIVERY_FEE
} from "./delivery";

test("checkDeliveryEligibility returns eligible for Rockdale postcode 2216", () => {
  const result = checkDeliveryEligibility("2216", 60.0);
  assert.equal(result.eligible, true);
  assert.equal(result.assignedBranch, "rockdale");
  assert.equal(result.deliveryFee, STANDARD_DELIVERY_FEE);
  assert.equal(result.isFreeDelivery, false);
});

test("checkDeliveryEligibility trims whitespace from postcode", () => {
  const result = checkDeliveryEligibility(" 2216 ", 60.0);
  assert.equal(result.eligible, true);
  assert.equal(result.assignedBranch, "rockdale");
});

test("checkDeliveryEligibility gives free delivery when subtotal >= $150", () => {
  const result = checkDeliveryEligibility("2210", 155.0);
  assert.equal(result.eligible, true);
  assert.equal(result.assignedBranch, "riverwood");
  assert.equal(result.deliveryFee, 0.0);
  assert.equal(result.isFreeDelivery, true);
});

test("checkDeliveryEligibility handles exact $150 boundary for free delivery", () => {
  const result = checkDeliveryEligibility("2210", FREE_DELIVERY_THRESHOLD);
  assert.equal(result.isFreeDelivery, true);
  assert.equal(result.deliveryFee, 0.0);
  assert.equal(result.amountToFreeDelivery, 0.0);
});

test("checkDeliveryEligibility enforces $50 minimum order threshold", () => {
  const result = checkDeliveryEligibility("2216", 35.0);
  assert.equal(result.eligible, true);
  assert.equal(result.meetsMinimumSpend, false);
  assert.equal(result.amountToMinimumSpend, 15.0);
});

test("checkDeliveryEligibility handles exact $50 boundary for minimum order", () => {
  const result = checkDeliveryEligibility("2216", MIN_ORDER_AMOUNT);
  assert.equal(result.eligible, true);
  assert.equal(result.meetsMinimumSpend, true);
  assert.equal(result.amountToMinimumSpend, 0.0);
});

test("checkDeliveryEligibility flags out-of-zone postcodes like Melbourne 3000 with clean precision", () => {
  const result = checkDeliveryEligibility("3000", 39.99);
  assert.equal(result.eligible, false);
  assert.equal(result.assignedBranch, null);
  assert.equal(result.amountToMinimumSpend, 10.01);
});
