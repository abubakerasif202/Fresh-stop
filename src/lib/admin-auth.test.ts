import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeBasic, isAdminAuthorized, safeEqual } from "./admin-auth";

const basic = (u: string, p: string) => "Basic " + Buffer.from(`${u}:${p}`).toString("base64");

test("safeEqual compares strings", () => {
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "abcd"), false);
});

test("decodeBasic parses and rejects malformed headers", () => {
  assert.deepEqual(decodeBasic(basic("a", "b:c")), { user: "a", pass: "b:c" });
  assert.equal(decodeBasic(null), null);
  assert.equal(decodeBasic("Bearer x"), null);
  assert.equal(decodeBasic("Basic !!!"), null);
  assert.equal(decodeBasic("Basic " + Buffer.from("nocolon").toString("base64")), null);
});

test("isAdminAuthorized requires both user and password", () => {
  assert.equal(isAdminAuthorized(basic("admin", "pw"), "admin", "pw"), true);
  assert.equal(isAdminAuthorized(basic("admin", "bad"), "admin", "pw"), false);
  assert.equal(isAdminAuthorized(basic("root", "pw"), "admin", "pw"), false);
  assert.equal(isAdminAuthorized(null, "admin", "pw"), false);
  assert.equal(isAdminAuthorized(basic("", ""), "", ""), true);
});
