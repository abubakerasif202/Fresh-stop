import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { GET, PATCH } from "./route";

const password = "orders-route-test-password";
const request = (authenticated = true, body?: string) => new Request("http://localhost/api/admin/orders", {
  method: body === undefined ? "GET" : "PATCH",
  headers: authenticated ? { authorization: `Basic ${Buffer.from(`admin:${password}`).toString("base64")}` } : {},
  ...(body === undefined ? {} : { body })
});

function setEnvironment(t: TestContext, values: Record<string, string | undefined>) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  const apply = (env: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  apply(values);
  t.after(() => apply(previous));
}

test("historical orders remain inaccessible in reviewed Preview without database configuration", async (t) => {
  setEnvironment(t, { ADMIN_PASSWORD: password, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: "reviewed-snapshot", DATABASE_URL: undefined });
  const query = t.mock.fn(async () => { throw new Error("Database must not be queried"); });
  const originalQuery = db.order.findMany;
  db.order.findMany = query as typeof db.order.findMany;
  t.after(() => { db.order.findMany = originalQuery; });
  const update = t.mock.fn(() => { throw new Error("Database must not be updated"); });
  const originalUpdate = db.order.update;
  db.order.update = update as typeof db.order.update;
  t.after(() => { db.order.update = originalUpdate; });

  for (const authenticated of [false, true]) {
    const read = request(authenticated);
    const mutation = request(authenticated, "{malformed");
    for (const response of [await GET(read), await PATCH(mutation)]) {
      assert.equal(response.status, authenticated ? 409 : 401);
      assert.equal(response.headers.get("cache-control"), "no-store");
      if (authenticated) assert.match((await response.json()).error, /read-only/);
    }
    assert.equal(mutation.bodyUsed, false);
  }
  assert.equal(query.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test("historical order reads disable caching for success and database failure", async (t) => {
  setEnvironment(t, { ADMIN_PASSWORD: password, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: "database" });
  const query = t.mock.fn(async () => []);
  const originalQuery = db.order.findMany;
  db.order.findMany = query as typeof db.order.findMany;
  t.after(() => { db.order.findMany = originalQuery; });
  const count = t.mock.fn(async () => 0);
  const originalCount = db.order.count;
  db.order.count = count as typeof db.order.count;
  t.after(() => { db.order.count = originalCount; });
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { orders: [], page: 1, pageSize: 25, total: 0 });

  query.mock.mockImplementation(async () => { throw new Error("Test database failure"); });
  t.mock.method(console, "error", () => {});
  const failed = await GET(request());
  assert.equal(failed.status, 500);
  assert.equal(failed.headers.get("cache-control"), "no-store");
});

test("historical order validation responses disable caching without writing", async (t) => {
  setEnvironment(t, { ADMIN_PASSWORD: password, ADMIN_USER: "admin", CATALOGUE_DATA_SOURCE: "database" });
  const update = t.mock.fn(() => { throw new Error("Database must not be updated"); });
  const originalUpdate = db.order.update;
  db.order.update = update as typeof db.order.update;
  t.after(() => { db.order.update = originalUpdate; });
  for (const body of ["{malformed", "null", "{}", '{"orderId":"example","orderStatus":"INVALID"}']) {
    const response = await PATCH(request(true, body));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  const crossOrigin = request(true, "{}");
  crossOrigin.headers.set("origin", "https://other.example");
  const response = await PATCH(crossOrigin);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(update.mock.callCount(), 0);
});
