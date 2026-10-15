/**
 * Local sliding-window limiter for development. Deployed requests use the
 * shared Redis limiter below; a backend outage never bypasses protection.
 */
export interface RateLimitOptions {
  /** Max hits allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  unavailable?: boolean;
}

const MAX_KEYS = 5000;
const store = new Map<string, number[]>();

function prune(now: number): void {
  if (store.size <= MAX_KEYS) return;
  for (const [key, hits] of store) {
    if (hits.length === 0 || now - hits[hits.length - 1] > 60 * 60 * 1000) store.delete(key);
  }
  // Hard cap: drop oldest keys if still oversized.
  if (store.size > MAX_KEYS) {
    const overflow = store.size - MAX_KEYS;
    let i = 0;
    for (const key of store.keys()) {
      if (i++ >= overflow) break;
      store.delete(key);
    }
  }
}

/** Records one hit for `key` and reports whether it is within the limit. */
export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now()
): RateLimitResult {
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);

  if (hits.length >= limit) {
    store.set(key, hits);
    const retryAfterSec = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }

  hits.push(now);
  store.set(key, hits);
  prune(now);
  return { ok: true, remaining: limit - hits.length, retryAfterSec: 0 };
}

/** Reports whether `key` is currently within its limit WITHOUT recording a hit. */
export function peekRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
  now: number = Date.now()
): RateLimitResult {
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }
  return { ok: true, remaining: limit - hits.length, retryAfterSec: 0 };
}

/** Test helper. */
export function resetRateLimits(): void {
  store.clear();
}

/**
 * Best-effort client IP. Only trust forwarded headers when deployed behind a
 * proxy that sets them (Vercel, Render, Cloudflare, nginx).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = process.env.VERCEL ? headers.get("x-vercel-forwarded-for") : headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  if (process.env.VERCEL) return "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}

// Atomic fixed window: the first hit sets expiry, subsequent hits cannot extend it.
const SHARED_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if ARGV[3] == '1' then
  count = redis.call('INCR', KEYS[1])
  if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[2]) end
end
return {count, redis.call('PTTL', KEYS[1])}
`;

export async function sharedRateLimit(
  key: string,
  options: RateLimitOptions,
  recordHit = true
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const unavailable = { ok: false, remaining: 0, retryAfterSec: 30, unavailable: true };
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 ||
      !Number.isSafeInteger(options.windowMs) || options.windowMs < 1) return unavailable;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) return unavailable;
    return recordHit ? rateLimit(key, options) : peekRateLimit(key, options);
  }
  try {
    if (new URL(url).protocol !== "https:") return unavailable;
    // Hash identifiers so IP addresses and order IDs are not stored in Redis keys.
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
    const hashedKey = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", SHARED_SCRIPT, 1, `fresh-stop:limit:${hashedKey}`, options.limit, options.windowMs, recordHit ? "1" : "0"]),
      cache: "no-store",
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return unavailable;
    const body: unknown = await response.json();
    const result = body && typeof body === "object" && "result" in body ? body.result : null;
    if (!Array.isArray(result) || result.length !== 2 || !result.every(Number.isFinite)) return unavailable;
    const [count, ttl] = result as number[];
    // A missing key is valid only for a read. Persistent keys or malformed
    // counters indicate backend corruption and must not bypass protection.
    if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(ttl) ||
        (ttl <= 0 && !(count === 0 && ttl === -2 && !recordHit)) ||
        (recordHit && count === 0)) return unavailable;
    // The recording request that reaches the limit is allowed; peeks at it are blocked.
    return { ok: recordHit ? count <= options.limit && ttl > 0 : count < options.limit,
      remaining: Math.max(0, options.limit - count),
      retryAfterSec: (recordHit ? count <= options.limit : count < options.limit) ? 0 : Math.max(1, Math.ceil(ttl / 1000)) };
  } catch {
    return unavailable;
  }
}
