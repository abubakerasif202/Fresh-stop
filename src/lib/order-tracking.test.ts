import test from "node:test";
import assert from "node:assert/strict";
import { createOrderTrackingToken, verifyOrderTrackingToken } from "./order-tracking";

const order = { id: "order-private-id", orderNumber: "FS-261020-ABCD", accessTokenHash: "hash" };
const now = 1_792_454_400_000;

test("tracking credentials are scoped, expiring, tamper resistant and require a dedicated secret", () => {
  const previous = process.env.ORDER_ACCESS_SECRET;
  try {
    delete process.env.ORDER_ACCESS_SECRET;
    assert.equal(createOrderTrackingToken(order, now), null);
    process.env.ORDER_ACCESS_SECRET = "short";
    assert.equal(createOrderTrackingToken(order, now), null);
    process.env.ORDER_ACCESS_SECRET = "local-test-only-tracking-secret-32-bytes";
    const token = createOrderTrackingToken(order, now)!;
    assert.equal(verifyOrderTrackingToken(token, order, now), true);
    assert.equal(createOrderTrackingToken(order, now), token);
    assert.equal(verifyOrderTrackingToken(token, { ...order, id: "another" }, now), false);
    assert.equal(verifyOrderTrackingToken(token, { ...order, accessTokenHash: "rotated" }, now), false);
    assert.equal(verifyOrderTrackingToken(token, { ...order, orderNumber: "another" }, now), false);
    assert.equal(verifyOrderTrackingToken(token.replace("v1.", "v2."), order, now), false);
    assert.equal(verifyOrderTrackingToken(`${token.slice(0, -1)}!`, order, now), false);
    assert.equal(verifyOrderTrackingToken(token, order, now + 30 * 24 * 60 * 60 * 1000), false);
    assert.equal(verifyOrderTrackingToken(null, order, now), false);
    process.env.ORDER_ACCESS_SECRET = "different-local-test-only-secret-32-bytes";
    assert.equal(verifyOrderTrackingToken(token, order, now), false);
  } finally {
    if (previous === undefined) delete process.env.ORDER_ACCESS_SECRET;
    else process.env.ORDER_ACCESS_SECRET = previous;
  }
});
