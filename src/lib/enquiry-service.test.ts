import "./testing/local-db-env";
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { db } from "./db";
import { ENQUIRY_RATE_LIMIT, handleEnquiry, type EnquiryDeps } from "./enquiry-service";
import type { EmailTransport, OutboundEmail } from "./email";

after(async () => { await db.$disconnect(); });

const MARK = "svc-test.example";
const valid = (over: Record<string, unknown> = {}) => ({
  kind: "WHOLESALE", name: "Sam Lee", businessName: "Lee Greengrocer", email: `sam@${MARK}`, phone: "0423936586", products: "Tomatoes", estimatedQuantity: "10 boxes", ...over
});
const req = (body: unknown, headers: Record<string, string> = {}, raw?: string) =>
  new Request("http://localhost/api/enquiries", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "198.51.100.7", ...headers },
    body: raw ?? JSON.stringify(body)
  });

function deps(over: Partial<EnquiryDeps> = {}) {
  const sent: OutboundEmail[] = [];
  const transport: EmailTransport = async (m) => { sent.push(m); };
  const d: EnquiryDeps = {
    db,
    rateLimit: async () => ({ ok: true, remaining: 5, retryAfterSec: 0 }),
    getTransport: () => transport,
    hashIp: (ip) => `h:${ip}`,
    ...over
  };
  return { d, sent };
}
const cleanup = () => db.enquiry.deleteMany({ where: { email: { endsWith: `@${MARK}` } } });

test("valid enquiry is stored, emailed once, and reports notified honestly", async () => {
  const { d, sent } = deps();
  try {
    const res = await handleEnquiry(req(valid()), d);
    assert.equal(res.status, 201);
    assert.equal(res.headers.get("cache-control"), "no-store");
    assert.deepEqual(await res.json(), { ok: true, notified: true });
    const rows = await db.enquiry.findMany({ where: { email: `sam@${MARK}` } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "NEW");
    assert.equal(rows[0].ipHash, "h:198.51.100.7");
    assert.ok(rows[0].emailSentAt);
    assert.equal(sent.length, 1);
  } finally { await cleanup(); }
});

test("invalid input returns 400 with field errors and stores nothing", async () => {
  const { d, sent } = deps();
  const res = await handleEnquiry(req(valid({ email: "bad", phone: "1" })), d);
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.ok(json.fields.email && json.fields.phone);
  assert.equal(await db.enquiry.count({ where: { email: "bad" } }), 0);
  assert.equal(sent.length, 0);
  assert.equal((await handleEnquiry(req(null, {}, "{not json"), d)).status, 400);
});

test("oversized bodies are refused with 413", async () => {
  const { d } = deps();
  assert.equal((await handleEnquiry(req(valid({ message: "x".repeat(40_000) })), d)).status, 413);
});

test("honeypot submissions look successful but are dropped silently", async () => {
  const { d, sent } = deps();
  const res = await handleEnquiry(req(valid({ website: "http://spam.example" })), d);
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { ok: true, notified: true });
  assert.equal(await db.enquiry.count({ where: { email: `sam@${MARK}` } }), 0);
  assert.equal(sent.length, 0);
});

test("cross-origin submissions are rejected before any work", async () => {
  let limiterCalls = 0;
  const { d } = deps({ rateLimit: async () => { limiterCalls += 1; return { ok: true, remaining: 1, retryAfterSec: 0 }; } });
  for (const headers of [{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }] as Record<string, string>[]) {
    const res = await handleEnquiry(req(valid(), headers), d);
    assert.equal(res.status, 403);
  }
  assert.equal(limiterCalls, 0);
  assert.equal(await db.enquiry.count({ where: { email: `sam@${MARK}` } }), 0);
});

test("rate limiting returns 429 with Retry-After; limiter outage fails closed with 503", async () => {
  const limited = deps({ rateLimit: async () => ({ ok: false, remaining: 0, retryAfterSec: 42 }) });
  const res = await handleEnquiry(req(valid()), limited.d);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "42");
  const down = deps({ rateLimit: async () => ({ ok: false, remaining: 0, retryAfterSec: 30, unavailable: true }) });
  assert.equal((await handleEnquiry(req(valid()), down.d)).status, 503);
  assert.equal(await db.enquiry.count({ where: { email: `sam@${MARK}` } }), 0);
  assert.ok(ENQUIRY_RATE_LIMIT.limit >= 1);
});

test("uses a per-IP limiter key that is scoped to enquiries", async () => {
  const keys: string[] = [];
  const { d } = deps({ rateLimit: async (key) => { keys.push(key); return { ok: false, remaining: 0, retryAfterSec: 1 }; } });
  await handleEnquiry(req(valid()), d);
  assert.deepEqual(keys, ["enquiry:198.51.100.7"]);
});

test("email failure keeps the record and says it was not emailed", async () => {
  const failing: EmailTransport = async () => { throw new Error("boom"); };
  const { d } = deps({ getTransport: () => failing });
  try {
    const res = await handleEnquiry(req(valid()), d);
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { ok: true, notified: false });
    const row = await db.enquiry.findFirstOrThrow({ where: { email: `sam@${MARK}` } });
    assert.equal(row.emailSentAt, null);
  } finally { await cleanup(); }
});

test("with no email provider configured the record is kept and notified is false", async () => {
  const { d } = deps({ getTransport: () => null });
  try {
    const res = await handleEnquiry(req(valid()), d);
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { ok: true, notified: false });
    assert.equal(await db.enquiry.count({ where: { email: `sam@${MARK}` } }), 1);
  } finally { await cleanup(); }
});

test("database failure returns a generic 503 with no internals", async () => {
  const broken = { enquiry: { create: async () => { throw new Error("connection to db.secret.supabase.co refused"); } } } as unknown as EnquiryDeps["db"];
  const { d } = deps({ db: broken });
  const res = await handleEnquiry(req(valid()), d);
  assert.equal(res.status, 503);
  assert.doesNotMatch(JSON.stringify(await res.json()), /supabase|secret|refused/);
});
