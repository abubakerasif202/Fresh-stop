/**
 * In-memory sliding-window rate limiter. Edge- and Node-safe (no imports).
 *
 * Scope: per server instance. This app uses SQLite, which already implies a
 * single instance with a persistent disk, so a per-process limiter is the right
 * fit. If you scale to multiple instances, swap `store` for a shared backend
 * (Redis/Upstash) behind the same `rateLimit()` signature.
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
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip")?.trim() || "unknown";
}
