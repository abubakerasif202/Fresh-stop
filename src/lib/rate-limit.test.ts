import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, resetRateLimits } from "./rate-limit";

test("allows up to the limit then blocks with retry-after", () => {
  resetRateLimits();
  const opts = { limit: 3, windowMs: 60_000 };
  const t0 = 1_000_000;
  assert.equal(rateLimit("ip:a", opts, t0).ok, true);
  assert.equal(rateLimit("ip:a", opts, t0 + 1).ok, true);
  const third = rateLimit("ip:a", opts, t0 + 2);
  assert.equal(third.ok, true);
  assert.equal(third.remaining, 0);
  const blocked = rateLimit("ip:a", opts, t0 + 3);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1 && blocked.retryAfterSec <= 60);
});

test("window slides and keys are independent", () => {
  resetRateLimits();
  const opts = { limit: 1, windowMs: 1000 };
  assert.equal(rateLimit("k1", opts, 0).ok, true);
  assert.equal(rateLimit("k2", opts, 0).ok, true);
  assert.equal(rateLimit("k1", opts, 500).ok, false);
  assert.equal(rateLimit("k1", opts, 1001).ok, true);
});
