import test from "node:test";
import assert from "node:assert/strict";
import { GET as checkoutGet, POST as checkoutPost } from "../checkout/route";
import { GET as slotsGet, POST as slotsPost } from "../pickup-slots/route";
import { GET as lookupGet, POST as lookupPost } from "../orders/lookup/route";
import { GET as deliveryGet, POST as deliveryPost } from "./check/route";

test("all legacy customer purchase and lookup endpoints return 410 without reading input", async () => {
  for (const handler of [checkoutGet, checkoutPost, slotsGet, slotsPost, lookupGet, lookupPost, deliveryGet, deliveryPost]) {
    const response = handler();
    assert.equal(response.status, 410);
    assert.match((await response.json()).error, /Online ordering is no longer available/);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
});
