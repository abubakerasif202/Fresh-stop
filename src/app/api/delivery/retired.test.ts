import "../../../lib/testing/local-db-env";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { db } from "../../../lib/db";
import { cleanupTestData, createTestZone, testPostcode } from "../../../lib/testing/db-fixtures";
import { GET as deliveryGet, POST as deliveryPost } from "./check/route";

const zoneIds: string[] = [];

after(async () => {
  await cleanupTestData(db, { zoneIds });
  await db.$disconnect();
});

let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter += 1)}`;

function post(body: unknown) {
  return new Request("http://localhost/api/delivery/check", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": nextIp() },
    body: JSON.stringify(body)
  });
}

function get(query: string) {
  return new Request(`http://localhost/api/delivery/check?${query}`, { headers: { "x-real-ip": nextIp() } });
}

test("delivery check returns only admin-approved zone numbers (POST)", async () => {
  const postcode = testPostcode();
  const zone = await createTestZone(db, postcode, { deliveryFeeCents: 850, freeDeliveryMinCents: 6000, minOrderCents: null });
  zoneIds.push(zone.id);

  const paid = await deliveryPost(post({ postcode, subtotalCents: 2000 }));
  assert.equal(paid.status, 200);
  const paidBody = await paid.json();
  assert.equal(paidBody.eligible, true);
  assert.equal(paidBody.deliveryFeeCents, 850);
  assert.equal(paidBody.freeDeliveryMinCents, 6000);
  assert.equal(paidBody.minOrderCents, null);
  assert.equal("primaryBranchSlug" in paidBody, false, "internal routing data stays private");

  const free = await (await deliveryPost(post({ postcode, subtotalCents: 6000 }))).json();
  assert.equal(free.deliveryFeeCents, 0);

  const legacyDollars = await (await deliveryPost(post({ postcode, subtotal: 60 }))).json();
  assert.equal(legacyDollars.deliveryFeeCents, 0, "legacy dollar subtotal is converted to cents");
});

test("a postcode with no approved zone is not eligible and no fee or threshold is invented", async () => {
  for (const response of [await deliveryPost(post({ postcode: "3000", subtotalCents: 8000 })), await deliveryGet(get("postcode=3000&subtotal=80"))]) {
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.eligible, false);
    assert.equal(body.code, "NO_APPROVED_ZONE");
    for (const key of ["deliveryFee", "deliveryFeeCents", "freeDeliveryThreshold", "minOrderAmount"]) {
      assert.equal(key in body, false, `${key} must not be present`);
    }
  }
});

test("delivery check works via GET and validates input", async () => {
  const postcode = testPostcode();
  zoneIds.push((await createTestZone(db, postcode, { deliveryFeeCents: 500 })).id);
  const res = await deliveryGet(get(`postcode=${postcode}&subtotalCents=100`));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).deliveryFeeCents, 500);

  assert.equal((await deliveryGet(get(""))).status, 400);
  assert.equal((await deliveryPost(post({}))).status, 400);
  assert.equal((await deliveryPost(post({ postcode: 2216 }))).status, 400);
  const bad = await deliveryGet(get("postcode=12"));
  assert.equal(bad.status, 200);
  assert.equal((await bad.json()).code, "INVALID_POSTCODE");
});

test("malformed or oversized JSON is a clean 4xx", async () => {
  const malformed = await deliveryPost(
    new Request("http://localhost/api/delivery/check", { method: "POST", headers: { "x-real-ip": nextIp() }, body: "{nope" })
  );
  assert.equal(malformed.status, 400);
  const big = await deliveryPost(post({ postcode: "2216", pad: "x".repeat(5000) }));
  assert.equal(big.status, 413);
});
