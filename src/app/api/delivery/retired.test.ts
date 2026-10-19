import test from "node:test";
import assert from "node:assert/strict";
import { GET as deliveryGet, POST as deliveryPost } from "./check/route";

test("delivery check endpoint validates Sydney postcodes via POST", async () => {
  // Test eligible Sydney postcode (Rockdale / St George)
  const reqEligible = new Request("http://localhost/api/delivery/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcode: "2216", subtotal: 65.0 })
  });
  const resEligible = await deliveryPost(reqEligible);
  assert.equal(resEligible.status, 200);
  const dataEligible = await resEligible.json();
  assert.equal(dataEligible.eligible, true);
  assert.equal(dataEligible.deliveryFee, 9.99);
  assert.equal(dataEligible.deliveryFeeCents, 999);

  // Test free delivery threshold ($150+)
  const reqFree = new Request("http://localhost/api/delivery/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcode: "2216", subtotal: 155.0 })
  });
  const resFree = await deliveryPost(reqFree);
  const dataFree = await resFree.json();
  assert.equal(dataFree.eligible, true);
  assert.equal(dataFree.deliveryFee, 0);
  assert.equal(dataFree.deliveryFeeCents, 0);

  // Test ineligible postcode (e.g. Melbourne 3000)
  const reqIneligible = new Request("http://localhost/api/delivery/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcode: "3000", subtotal: 80.0 })
  });
  const resIneligible = await deliveryPost(reqIneligible);
  assert.equal(resIneligible.status, 200);
  const dataIneligible = await resIneligible.json();
  assert.equal(dataIneligible.eligible, false);

  // Test missing postcode input
  const reqMissing = new Request("http://localhost/api/delivery/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  const resMissing = await deliveryPost(reqMissing);
  assert.equal(resMissing.status, 400);
});

test("delivery check endpoint validates Sydney postcodes via GET", async () => {
  const req = new Request("http://localhost/api/delivery/check?postcode=2210&subtotal=55");
  const res = await deliveryGet(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.eligible, true);
  assert.equal(data.deliveryFee, 9.99);

  const reqEmpty = new Request("http://localhost/api/delivery/check");
  const resEmpty = await deliveryGet(reqEmpty);
  assert.equal(resEmpty.status, 400);
});
