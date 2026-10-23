import "@/lib/testing/local-db-env";
import test, { after, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { setEmailTransportForTests, type OutboundEmail } from "@/lib/email";
import { GET, PATCH } from "./route";

after(async () => { await db.$disconnect(); });

const password = "enquiries-route-test-password";
const MARK = "admin-enq.example";
const auth = { authorization: `Basic ${Buffer.from(`admin:${password}`).toString("base64")}` };

function setEnv(t: TestContext, values: Record<string, string | undefined>) {
  const previous = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  const apply = (env: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  };
  apply(values);
  t.after(() => apply(previous));
}
const env = (t: TestContext) => setEnv(t, { ADMIN_PASSWORD: password, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: "database" });
const get = (query = "", authed = true) => new Request(`http://localhost/api/admin/enquiries${query}`, { headers: authed ? auth : {} });
const patch = (body: unknown, headers: Record<string, string> = auth) =>
  new Request("http://localhost/api/admin/enquiries", { method: "PATCH", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
const seed = (over: Record<string, unknown> = {}) =>
  db.enquiry.create({ data: { kind: "CONTACT", name: "Ana", email: `ana@${MARK}`, phone: "0423936586", message: "hello", ...over } });
const cleanup = async () => {
  const rows = await db.enquiry.findMany({ where: { email: { endsWith: `@${MARK}` } }, select: { id: true } });
  await db.adminAuditLog.deleteMany({ where: { entityType: "Enquiry", entityId: { in: rows.map((r) => r.id) } } });
  await db.enquiry.deleteMany({ where: { email: { endsWith: `@${MARK}` } } });
};

test("admin enquiries reject unauthenticated and unconfigured requests", async (t) => {
  setEnv(t, { ADMIN_PASSWORD: password, CATALOGUE_DATA_SOURCE: "database" });
  assert.equal((await GET(get("", false))).status, 401);
  const unauth = patch({ enquiryId: "x", status: "CLOSED" }, {});
  assert.equal((await PATCH(unauth)).status, 401);
  assert.equal(unauth.bodyUsed, false);
  setEnv(t, { ADMIN_PASSWORD: undefined });
  assert.equal((await GET(get())).status, 503);
});

test("read-only reviewed Preview blocks reads and writes", async (t) => {
  setEnv(t, { ADMIN_PASSWORD: password, CATALOGUE_DATA_SOURCE: "reviewed-snapshot" });
  assert.equal((await GET(get())).status, 409);
  assert.equal((await PATCH(patch({}))).status, 409);
});

test("lists enquiries newest first with kind and status filters, no-store", async (t) => {
  env(t);
  const a = await seed({ kind: "WHOLESALE", businessName: "B", products: "p" });
  const b = await seed({ status: "CLOSED" });
  try {
    const res = await GET(get("?kind=WHOLESALE"));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const json = await res.json();
    const ids = json.enquiries.map((e: { id: string }) => e.id);
    assert.ok(ids.includes(a.id) && !ids.includes(b.id));
    assert.equal("ipHash" in json.enquiries[0], false);
    const closed = (await (await GET(get("?status=CLOSED"))).json()).enquiries.map((e: { id: string }) => e.id);
    assert.ok(closed.includes(b.id) && !closed.includes(a.id));
  } finally { await cleanup(); }
});

test("status update writes an audit row; invalid input and cross-origin are refused", async (t) => {
  env(t);
  const row = await seed();
  try {
    assert.equal((await PATCH(patch({ enquiryId: row.id, status: "BOGUS" }))).status, 400);
    assert.equal((await PATCH(patch({ enquiryId: "", status: "CLOSED" }))).status, 400);
    assert.equal((await PATCH(patch("{bad"))).status, 400);
    assert.equal((await PATCH(patch({ enquiryId: row.id, status: "CLOSED" }, { ...auth, origin: "https://evil.example" }))).status, 403);
    assert.equal((await db.enquiry.findUniqueOrThrow({ where: { id: row.id } })).status, "NEW");

    const ok = await PATCH(patch({ enquiryId: row.id, status: "CONTACTED" }));
    assert.equal(ok.status, 200);
    assert.equal((await db.enquiry.findUniqueOrThrow({ where: { id: row.id } })).status, "CONTACTED");
    const audit = await db.adminAuditLog.findMany({ where: { entityType: "Enquiry", entityId: row.id } });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].adminUser, "admin");
    assert.equal((await PATCH(patch({ enquiryId: "nope-id", status: "CLOSED" }))).status, 404);
  } finally { await cleanup(); }
});

test("resend_email retries a notification once and never duplicates", async (t) => {
  env(t);
  const row = await seed();
  const sent: OutboundEmail[] = [];
  setEmailTransportForTests(async (m) => { sent.push(m); });
  t.after(() => setEmailTransportForTests(null));
  try {
    const first = await (await PATCH(patch({ enquiryId: row.id, action: "resend_email" }))).json();
    assert.equal(first.emailed, true);
    const second = await (await PATCH(patch({ enquiryId: row.id, action: "resend_email" }))).json();
    assert.equal(second.emailed, false);
    assert.equal(second.reason, "ALREADY_SENT");
    assert.equal(sent.length, 1);
  } finally { await cleanup(); }
});
