import test from "node:test";
import assert from "node:assert/strict";
import { isCheckoutCancelled } from "./checkout-cancelled";

test("detects the cancelled flag Stripe's cancel_url carries", () => {
  assert.equal(isCheckoutCancelled("?cancelled=1"), true);
  assert.equal(isCheckoutCancelled("cancelled=1"), true);
  assert.equal(isCheckoutCancelled("?foo=bar&cancelled=1"), true);
});

test("is false without the flag or with any other value", () => {
  assert.equal(isCheckoutCancelled(""), false);
  assert.equal(isCheckoutCancelled("?cancelled=0"), false);
  assert.equal(isCheckoutCancelled("?cancelled=true"), false);
  assert.equal(isCheckoutCancelled("?cancelled="), false);
  assert.equal(isCheckoutCancelled("?other=1"), false);
});
