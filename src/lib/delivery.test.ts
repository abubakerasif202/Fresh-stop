import "./testing/local-db-env";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import { checkDelivery, getPickupMinOrderCents, type DeliveryClient } from "./delivery";
import { cleanupTestData, createTestZone, testPostcode } from "./testing/db-fixtures";

const zoneIds: string[] = [];

after(async () => {
  await cleanupTestData(db, { zoneIds });
  await db.$disconnect();
});

async function zone(postcodes: string, overrides: Record<string, unknown> = {}) {
  const created = await createTestZone(db, postcodes, overrides);
  zoneIds.push(created.id);
  return created;
}

test("malformed postcodes are rejected before any lookup", async () => {
  for (const bad of ["", "abc", "123", "12345", "2 16", "２２１６"]) {
    const res = await checkDelivery(bad, 0, db);
    assert.equal(res.eligible, false);
    if (!res.eligible) assert.equal(res.code, "INVALID_POSTCODE");
  }
});

test("a postcode with no approved zone is not eligible and the message invents no numbers", async () => {
  const res = await checkDelivery("7000", 12345, db);
  assert.equal(res.eligible, false);
  if (!res.eligible) {
    assert.equal(res.code, "NO_APPROVED_ZONE");
    assert.doesNotMatch(res.message, /\$|\d+\.\d\d/);
  }
});

test("only approved, active zones with a configured fee are used", async () => {
  const unapproved = testPostcode();
  const inactive = testPostcode();
  const noFee = testPostcode();
  await zone(unapproved, { isApproved: false });
  await zone(inactive, { isActive: false });
  await zone(noFee, { deliveryFeeCents: null });
  for (const code of [unapproved, inactive, noFee]) {
    const res = await checkDelivery(code, 10_000, db);
    assert.equal(res.eligible, false, `postcode ${code}`);
  }
});

test("an approved zone returns its approved cents, matching any postcode in its comma list", async () => {
  const a = testPostcode();
  const b = testPostcode();
  const z = await zone(`${a}, ${b}`, { deliveryFeeCents: 850, freeDeliveryMinCents: 6000, minOrderCents: 1500 });
  for (const code of [a, b]) {
    const res = await checkDelivery(code, 2000, db);
    assert.equal(res.eligible, true);
    if (res.eligible) {
      assert.equal(res.zoneName, z.name);
      assert.equal(res.deliveryFeeCents, 850);
      assert.equal(res.zoneFeeCents, 850);
      assert.equal(res.freeDeliveryMinCents, 6000);
      assert.equal(res.minOrderCents, 1500);
      assert.equal(res.primaryBranchSlug, "test-branch");
    }
  }
});

test("free delivery starts exactly at the approved threshold; the minimum order applies below it", async () => {
  const code = testPostcode();
  await zone(code, { deliveryFeeCents: 850, freeDeliveryMinCents: 6000, minOrderCents: 1500 });
  const below = await checkDelivery(code, 1499, db);
  assert.equal(below.eligible, false);
  if (!below.eligible) {
    assert.equal(below.code, "BELOW_MIN_ORDER");
    assert.equal(below.minOrderCents, 1500);
  }
  const paid = await checkDelivery(code, 5999, db);
  assert.equal(paid.eligible && paid.deliveryFeeCents, 850);
  const free = await checkDelivery(code, 6000, db);
  assert.equal(free.eligible && free.deliveryFeeCents, 0);
  assert.equal(free.eligible && free.zoneFeeCents, 850);
});

test("a database failure is DB_UNAVAILABLE, not a fallback to default zones", async () => {
  const broken = {
    deliveryZone: { findMany: async () => { throw new Error("down"); } },
    deliverySetting: db.deliverySetting
  } as unknown as DeliveryClient;
  const res = await checkDelivery("2216", 5000, broken);
  assert.equal(res.eligible, false);
  if (!res.eligible) assert.equal(res.code, "DB_UNAVAILABLE");
});

test("pickup minimum is read from an approved setting only when it is a valid whole number", async () => {
  const withValue = (value: string | null) =>
    ({ deliverySetting: { findUnique: async () => (value === null ? null : { id: "1", key: "k", value, updatedAt: new Date() }) } }) as unknown as Pick<
      typeof db,
      "deliverySetting"
    >;
  assert.equal(await getPickupMinOrderCents(withValue(null)), null);
  assert.equal(await getPickupMinOrderCents(withValue("2500")), 2500);
  assert.equal(await getPickupMinOrderCents(withValue("25.50")), null);
  assert.equal(await getPickupMinOrderCents(withValue("-5")), null);
  assert.equal(await getPickupMinOrderCents(withValue("lots")), null);
});
