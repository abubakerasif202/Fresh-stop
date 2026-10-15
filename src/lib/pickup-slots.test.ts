import { test } from "node:test";
import assert from "node:assert/strict";
import { getPickupSlots, isValidPickupSlot } from "./pickup-slots";

const d = (iso: string) => new Date(iso);

test("before opening: first slot is opening time today", () => {
  // Fri 16 Oct 2026 05:00 AEDT
  const slots = getPickupSlots(d("2026-10-15T18:00:00Z"));
  assert.equal(slots[0].value, "Fri 16 Oct, 7:00 AM - 8:00 AM");
  assert.equal(slots[0].startsAt, "2026-10-15T20:00:00.000Z");
  assert.equal(slots[0].endsAt, "2026-10-15T21:00:00.000Z");
  assert.equal(slots[0].dayLabel, "Today (Fri 16 Oct)");
});

test("2h cutoff boundary is inclusive at exactly now+2h", () => {
  // 12:00 AEDT -> 2:00 PM start is exactly now+2h
  const exact = getPickupSlots(d("2026-10-16T01:00:00Z"));
  assert.equal(exact[0].value, "Fri 16 Oct, 2:00 PM - 3:00 PM");
  const oneSecLater = getPickupSlots(d("2026-10-16T01:00:01Z"));
  assert.equal(oneSecLater[0].value, "Fri 16 Oct, 3:00 PM - 4:00 PM");
});

test("last Mon-Sat window ends by closing time (6-7 PM)", () => {
  const slots = getPickupSlots(d("2026-10-15T18:00:00Z"));
  const fri = slots.filter((s) => s.dayLabel.startsWith("Today"));
  assert.equal(fri.length, 12);
  assert.equal(fri[fri.length - 1].label, "6:00 PM - 7:00 PM");
});

test("after closing: today empty, tomorrow starts at opening", () => {
  // Fri 16 Oct 19:00 AEDT
  const slots = getPickupSlots(d("2026-10-16T08:00:00Z"));
  assert.ok(slots.every((s) => !s.dayLabel.startsWith("Today")));
  assert.equal(slots[0].value, "Sat 17 Oct, 7:00 AM - 8:00 AM");
  assert.equal(slots[0].startsAt, "2026-10-16T20:00:00.000Z");
  assert.equal(slots.length, 12 + 10);
});

test("Sunday hours 8 AM - 6 PM", () => {
  // Sun 18 Oct 00:00 AEDT
  const slots = getPickupSlots(d("2026-10-17T13:00:00Z"));
  const sun = slots.filter((s) => s.dayLabel.startsWith("Today"));
  assert.equal(sun.length, 10);
  assert.equal(sun[0].label, "8:00 AM - 9:00 AM");
  assert.equal(sun[sun.length - 1].label, "5:00 PM - 6:00 PM");
});

test("DST start (Sun 4 Oct 2026): offsets switch from +10 to +11", () => {
  // Fri 2 Oct 20:00 AEST
  const slots = getPickupSlots(d("2026-10-02T10:00:00Z"));
  const sat = slots.find((s) => s.value === "Sat 3 Oct, 7:00 AM - 8:00 AM");
  const sun = slots.find((s) => s.value === "Sun 4 Oct, 8:00 AM - 9:00 AM");
  assert.equal(sat?.startsAt, "2026-10-02T21:00:00.000Z");
  assert.equal(sun?.startsAt, "2026-10-03T21:00:00.000Z");
});

test("DST end (Sun 4 Apr 2027): offsets switch from +11 to +10", () => {
  // Fri 2 Apr 20:00 AEDT
  const slots = getPickupSlots(d("2027-04-02T09:00:00Z"));
  const sat = slots.find((s) => s.value === "Sat 3 Apr, 7:00 AM - 8:00 AM");
  const sun = slots.find((s) => s.value === "Sun 4 Apr, 8:00 AM - 9:00 AM");
  assert.equal(sat?.startsAt, "2027-04-02T20:00:00.000Z");
  assert.equal(sun?.startsAt, "2027-04-03T22:00:00.000Z");
});

test("isValidPickupSlot accepts offered slots and rejects stale/unknown", () => {
  const now = d("2026-10-16T01:00:00Z");
  assert.equal(isValidPickupSlot("Fri 16 Oct, 2:00 PM - 3:00 PM", now), true);
  assert.equal(isValidPickupSlot("Fri 16 Oct, 1:00 PM - 2:00 PM", now), false);
  assert.equal(isValidPickupSlot("Today 2:00 PM - 5:00 PM", now), false);
  assert.equal(isValidPickupSlot("", now), false);
  assert.equal(isValidPickupSlot(undefined, now), false);
});
