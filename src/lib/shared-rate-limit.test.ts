import { test } from "node:test";
import assert from "node:assert/strict";
import { sharedRateLimit } from "./rate-limit";

test("shared limiter validates responses, expiry and outages without falling back", async () => {
  const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousVercel = process.env.VERCEL;
  const originalFetch = globalThis.fetch;
  process.env.VERCEL = "1";
  const options = { limit: 2, windowMs: 10000 };
  try {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    assert.equal((await sharedRateLimit("test", options)).unavailable, true);
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    let result: unknown = [2, 9000];
    globalThis.fetch = async (_input, init) => {
      const command = JSON.parse(String(init?.body)) as unknown[];
      assert.equal(command[0], "EVAL");
      assert.ok(!String(command[3]).includes("203.0.113.1"));
      assert.equal(init?.cache, "no-store");
      return Response.json({ result });
    };
    const allowed = await sharedRateLimit("203.0.113.1", options);
    assert.equal(allowed.ok, true);
    assert.equal(allowed.retryAfterSec, 0);
    assert.equal((await sharedRateLimit("203.0.113.1", options, false)).ok, false);
    result = [3, 8000];
    assert.equal((await sharedRateLimit("203.0.113.1", options)).ok, false);
    result = [0, -2];
    assert.equal((await sharedRateLimit("203.0.113.1", options, false)).ok, true);
    assert.equal((await sharedRateLimit("test", options)).unavailable, true);
    for (const invalid of [[-1, 9000], [1.5, 9000], [1, -1], [1, -2], [1, 0], [1, 1.5], [0, 9000]]) {
      result = invalid;
      assert.equal((await sharedRateLimit("test", options)).unavailable, true, JSON.stringify(invalid));
    }
    for (const invalidOptions of [{ limit: 0, windowMs: 1000 }, { limit: 1, windowMs: -1 }, { limit: 1.5, windowMs: 1000 }]) {
      assert.equal((await sharedRateLimit("test", invalidOptions)).unavailable, true);
    }
    result = "unexpected";
    assert.equal((await sharedRateLimit("test", options)).unavailable, true);
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal((await sharedRateLimit("test", options)).unavailable, true);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries({ UPSTASH_REDIS_REST_URL: previousUrl, UPSTASH_REDIS_REST_TOKEN: previousToken, VERCEL: previousVercel })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
