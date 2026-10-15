import test from "node:test";
import assert from "node:assert/strict";
import { checkDeliveryEligibility, ST_GEORGE_POSTCODES, CANTERBURY_POSTCODES } from "./delivery";

test("checkDeliveryEligibility returns eligible for Rockdale postcode 2216", () => {
  const result = checkDeliveryEligibility("2216", 60.0);
  assert.equal(result.eligible, true);
  assert.equal(result.assignedBranch, "rockdale");
  assert.equal(result.deliveryFee, 9.99);
  assert.equal(result.isFreeDelivery, false);
});

test("checkDeliveryEligibility gives free delivery when subtotal >= $150", () => {
  const result = checkDeliveryEligibility("2210", 155.0);
  assert.equal(result.eligible, true);
  assert.equal(result.assignedBranch, "riverwood");
  assert.equal(result.deliveryFee, 0.0);
  assert.equal(result.isFreeDelivery, true);
});

test("checkDeliveryEligibility enforces $50 minimum order threshold", () => {
  const result = checkDeliveryEligibility("2216", 35.0);
  assert.equal(result.eligible, true);
  assert.equal(result.meetsMinimumSpend, false);
  assert.equal(result.amountToMinimumSpend, 15.0);
});

test("checkDeliveryEligibility flags out-of-zone postcodes like Melbourne 3000", () => {
  const result = checkDeliveryEligibility("3000", 100.0);
  assert.equal(result.eligible, false);
  assert.equal(result.assignedBranch, null);
});
