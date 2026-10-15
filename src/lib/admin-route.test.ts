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
