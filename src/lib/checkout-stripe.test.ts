import test from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { toStripeLike } from "./checkout-stripe";

test("session recovery adapter follows bounded pagination and filters by creation time", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const client = { checkout: { sessions: { list: async (params: Record<string, unknown>) => {
    calls.push(params);
    return { data: [{ id: `cs_${calls.length}`, url: null }], has_more: calls.length < 2 };
  } } } } as unknown as Stripe;
  const result = await toStripeLike(client).checkout.sessions.listRecent!(123);
  assert.equal(result.complete, true);
  assert.deepEqual(result.sessions.map((session) => session.id), ["cs_1", "cs_2"]);
  assert.deepEqual(calls, [
    { created: { gte: 123 }, limit: 100 },
    { created: { gte: 123 }, limit: 100, starting_after: "cs_1" }
  ]);
});

test("session recovery adapter marks truncated provider results incomplete", async () => {
  let calls = 0;
  const client = { checkout: { sessions: { list: async () => {
    calls += 1;
    return { data: [{ id: `cs_${calls}`, url: null }], has_more: true };
  } } } } as unknown as Stripe;
  const result = await toStripeLike(client).checkout.sessions.listRecent!(123);
  assert.equal(calls, 3);
  assert.equal(result.complete, false);
});
