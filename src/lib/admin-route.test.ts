import test from "node:test";
import assert from "node:assert/strict";
import { requireAdmin, sameOrigin } from "./admin-route";
import { GET as listProducts, POST as createProduct } from "../app/api/admin/products/route";
import { PATCH as updateProduct } from "../app/api/admin/products/[id]/route";
import { GET as listImages } from "../app/api/admin/product-images/route";

const basic = (u: string, p: string) => `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`;
const req = (auth?: string, init: RequestInit = {}) =>
  new Request("http://localhost/api/admin/products", {
    ...init,
    headers: { ...(auth ? { authorization: auth } : {}), ...(init.headers as Record<string, string>) }
  });

test("every product-management handler rejects unauthenticated requests before touching the database", async () => {
  process.env.ADMIN_PASSWORD = "correct-horse-battery";
  delete process.env.ADMIN_USER;
  const ctx = { params: Promise.resolve({ id: "x" }) };
  const responses = [
    await listProducts(req()),
    await createProduct(req(undefined, { method: "POST", body: "{}" })),
    await updateProduct(req(undefined, { method: "PATCH", body: "{}" }), ctx),
    await listImages(req())
  ];
  for (const res of responses) assert.equal(res.status, 401);
});

test("wrong credentials are rejected, correct ones pass the gate", () => {
  process.env.ADMIN_PASSWORD = "correct-horse-battery";
  assert.equal(requireAdmin(req(basic("admin", "nope")))?.status, 401);
  assert.equal(requireAdmin(req(basic("root", "correct-horse-battery")))?.status, 401);
  assert.equal(requireAdmin(req(basic("admin", "correct-horse-battery"))), null);
});

test("admin fails closed when no password is configured", () => {
  delete process.env.ADMIN_PASSWORD;
  assert.equal(requireAdmin(req(basic("admin", "")))?.status, 503);
});

test("cross-origin mutations are refused", () => {
  assert.equal(sameOrigin(req(undefined, { headers: { origin: "https://evil.test" } })), false);
  assert.equal(sameOrigin(req(undefined, { headers: { origin: "http://localhost" } })), true);
  assert.equal(sameOrigin(req()), true);
});

test("reviewed snapshot rejects all authenticated admin mutations before input or DB access", async () => {
  const { PATCH: updateOrder } = await import("../app/api/admin/orders/route");
  const previousMode=process.env.CATALOGUE_DATA_SOURCE;
  const previousPassword=process.env.ADMIN_PASSWORD;
  process.env.CATALOGUE_DATA_SOURCE="reviewed-snapshot";
  process.env.ADMIN_PASSWORD="preview-test-password";
  try {
    const auth=basic("admin","preview-test-password");
    const responses=[
      await createProduct(req(auth,{method:"POST",body:"{invalid"})),
      await updateProduct(req(auth,{method:"PATCH",body:"{invalid"}),{params:Promise.resolve({id:"x"})}),
      await updateOrder(req(auth,{method:"PATCH",body:"{invalid"}))
    ];
    for(const response of responses) {
      assert.equal(response.status,409);
      assert.match((await response.json()).error,/read-only/);
    }
  } finally {
    if(previousMode===undefined) delete process.env.CATALOGUE_DATA_SOURCE; else process.env.CATALOGUE_DATA_SOURCE=previousMode;
    if(previousPassword===undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD=previousPassword;
  }
});

test("authenticated reviewed admin catalogue reads use snapshot data without database access", async () => {
  const previousMode=process.env.CATALOGUE_DATA_SOURCE;
  const previousPassword=process.env.ADMIN_PASSWORD;
  process.env.CATALOGUE_DATA_SOURCE="reviewed-snapshot";
  process.env.ADMIN_PASSWORD="preview-read-test";
  try {
    assert.equal((await listProducts(req())).status,401);
    const response=await listProducts(req(basic("admin","preview-read-test")));
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.readOnly,true);
    assert.ok(data.products.length>10);
    assert.ok(data.categories.length>0);
    assert.equal(data.branches.length,2);
    assert.ok(data.products.some((p: {source:string}) => p.source === "asset-review"));
    for(const product of data.products) {
      assert.equal(product.price,null);
      assert.equal(product.unit,null);
      assert.deepEqual(product.inventory,[]);
    }
  } finally {
    if(previousMode===undefined) delete process.env.CATALOGUE_DATA_SOURCE; else process.env.CATALOGUE_DATA_SOURCE=previousMode;
    if(previousPassword===undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD=previousPassword;
  }
});
