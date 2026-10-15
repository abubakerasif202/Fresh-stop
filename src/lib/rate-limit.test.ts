import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit, peekRateLimit, resetRateLimits } from "./rate-limit";

test("peekRateLimit does not record hits and reflects blocked state", () => {
  resetRateLimits();
  const opts = { limit: 2, windowMs: 1000 };
  assert.equal(peekRateLimit("p", opts, 0).ok, true);
  assert.equal(peekRateLimit("p", opts, 0).ok, true);
  assert.equal(peekRateLimit("p", opts, 0).remaining, 2);
  rateLimit("p", opts, 0);
  rateLimit("p", opts, 1);
  const blocked = peekRateLimit("p", opts, 2);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(peekRateLimit("p", opts, 1500).ok, true);
});

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
