import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { MAX_ADMIN_BODY_BYTES, adminErrorResponse, adminUserFrom, auditJson, guardAdminMutation } from "./admin-audit";

const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
const PASSWORD = "audit-guard-test-password";

function useEnv(t: TestContext, values: Record<string, string | undefined>) {
  const previous = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  const apply = (env: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
  apply(values);
  t.after(() => apply(previous));
}

const post = (headers: Record<string, string>, body: string) =>
  new Request("http://localhost/api/admin/x", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });

test("guard rejects missing and wrong credentials with 401 and never reads the body", async (t) => {
  useEnv(t, { ADMIN_PASSWORD: PASSWORD, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: undefined });
  for (const headers of [{}, { authorization: basic("admin", "wrong") }, { authorization: basic("root", PASSWORD) }] as Record<string, string>[]) {
    const request = post(headers, "{}");
    const guard = await guardAdminMutation(request);
    assert.equal(guard.ok, false);
    if (!guard.ok) assert.equal(guard.response.status, 401);
    assert.equal(request.bodyUsed, false);
  }
});

test("guard fails closed with 503 when ADMIN_PASSWORD is not configured", async (t) => {
  useEnv(t, { ADMIN_PASSWORD: undefined, CATALOGUE_DATA_SOURCE: undefined });
  const guard = await guardAdminMutation(post({ authorization: basic("admin", "") }, "{}"));
  assert.equal(guard.ok, false);
  if (!guard.ok) assert.equal(guard.response.status, 503);
});

test("guard rejects cross-origin and cross-site requests", async (t) => {
  useEnv(t, { ADMIN_PASSWORD: PASSWORD, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: undefined });
  const auth = { authorization: basic("admin", PASSWORD) };
  for (const extra of [{ origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }] as Record<string, string>[]) {
    const guard = await guardAdminMutation(post({ ...auth, ...extra }, "{}"));
    assert.equal(guard.ok, false);
    if (!guard.ok) assert.equal(guard.response.status, 403);
  }
});

test("guard enforces body size, JSON syntax and object shape", async (t) => {
  useEnv(t, { ADMIN_PASSWORD: PASSWORD, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: undefined });
  const auth = { authorization: basic("admin", PASSWORD) };
  const cases: [string, number][] = [
    [JSON.stringify({ pad: "x".repeat(MAX_ADMIN_BODY_BYTES) }), 413],
    ["{not json", 400],
    ["[]", 400],
    ["null", 400]
  ];
  for (const [body, status] of cases) {
    const guard = await guardAdminMutation(post(auth, body));
    assert.equal(guard.ok, false, body.slice(0, 20));
    if (!guard.ok) assert.equal(guard.response.status, status, body.slice(0, 20));
  }
});

test("guard passes a valid request and reports the Basic-Auth user, never the password", async (t) => {
  useEnv(t, { ADMIN_PASSWORD: PASSWORD, ADMIN_USER: "alice", CATALOGUE_DATA_SOURCE: undefined });
  const guard = await guardAdminMutation(post({ authorization: basic("alice", PASSWORD), origin: "http://localhost" }, '{"a":1}'));
  assert.equal(guard.ok, true);
  if (guard.ok) {
    assert.equal(guard.admin, "alice");
    assert.deepEqual(guard.body, { a: 1 });
  }
  assert.equal(adminUserFrom(new Request("http://localhost/")), "admin");
});

test("guard blocks mutations in the read-only reviewed preview before reading the body", async (t) => {
  useEnv(t, { ADMIN_PASSWORD: PASSWORD, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: "reviewed-snapshot" });
  const request = post({ authorization: basic("admin", PASSWORD) }, "{}");
  const guard = await guardAdminMutation(request);
  assert.equal(guard.ok, false);
  if (!guard.ok) assert.equal(guard.response.status, 409);
  assert.equal(request.bodyUsed, false);
});

test("audit JSON redacts sensitive keys and bounds size", () => {
  const text = auditJson({ price: 5, adminPassword: "hunter2", nested: { apiKey: "k", token: "t" } }) ?? "";
  assert.ok(!text.includes("hunter2"));
  assert.ok(!text.includes('"k"'));
  assert.match(text, /\[redacted\]/);
  assert.ok((auditJson({ big: "x".repeat(50_000) }) ?? "").length < 8100);
  assert.equal(auditJson(null), null);
});

test("unexpected admin failures log only allowlisted codes, never database payloads", async (t) => {
  const logged: unknown[][] = [];
  t.mock.method(console, "error", (...args: unknown[]) => logged.push(args));
  for (const code of ["P2002", "customer@example.test"]) {
    const error = Object.assign(new Error("customer@example.test secret mutation payload"), { code });
    const response = adminErrorResponse(error, "Updating product");
    assert.equal(response.status, 500);
    assert.ok(!JSON.stringify(await response.json()).includes("customer@example.test"));
  }
  assert.deepEqual(logged, [["Updating product failed", { code: "P2002" }], ["Updating product failed", { code: "UNEXPECTED_ERROR" }]]);
});
