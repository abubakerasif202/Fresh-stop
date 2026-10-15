import { test } from "node:test";
import assert from "node:assert/strict";
import { signOrderToken, verifyOrderToken } from "./order-token";

test("tokens verify only for the same order and secret", () => {
  process.env.ORDER_TOKEN_SECRET = "unit-test-secret-0123456789";
  const token = signOrderToken("order_1");
  assert.ok(token && token.length === 32);
  assert.equal(verifyOrderToken("order_1", token), true);
  assert.equal(verifyOrderToken("order_2", token), false);
  assert.equal(verifyOrderToken("order_1", "x".repeat(32)), false);
  assert.equal(verifyOrderToken("order_1", null), false);
});

test("fails closed when the secret is missing or too short", () => {
  process.env.ORDER_TOKEN_SECRET = "short";
  assert.equal(signOrderToken("order_1"), null);
  assert.equal(verifyOrderToken("order_1", "a".repeat(32)), false);
  delete process.env.ORDER_TOKEN_SECRET;
  assert.equal(signOrderToken("order_1"), null);
});
