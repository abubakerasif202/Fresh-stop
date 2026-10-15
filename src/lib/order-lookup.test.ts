import { test } from "node:test";
import assert from "node:assert/strict";
import { emailsMatch, normalizeEmail, parseLookupBody } from "./order-lookup";

test("emailsMatch is case-insensitive and trims whitespace", () => {
  assert.equal(emailsMatch("  Jane@Example.com ", "jane@example.COM"), true);
});

test("emailsMatch rejects different or empty emails", () => {
  assert.equal(emailsMatch("a@b.com", "a@b.co"), false);
  assert.equal(emailsMatch("", ""), false);
  assert.equal(emailsMatch("   ", "a@b.com"), false);
});

test("normalizeEmail lowercases and trims", () => {
  assert.equal(normalizeEmail(" A@B.com "), "a@b.com");
});

test("parseLookupBody validates shape", () => {
  assert.deepEqual(parseLookupBody({ orderId: " abc123 ", email: " a@b.com " }), {
    orderId: "abc123",
    email: "a@b.com"
  });
  assert.equal(parseLookupBody(null), null);
  assert.equal(parseLookupBody({ orderId: 1, email: "a@b.com" }), null);
  assert.equal(parseLookupBody({ orderId: "../x", email: "a@b.com" }), null);
  assert.equal(parseLookupBody({ orderId: "abc", email: "" }), null);
  assert.equal(parseLookupBody({ orderId: "a".repeat(65), email: "a@b.com" }), null);
});

test("lookup canonicalizes reference case before rate limiting but preserves opaque IDs", () => {
  for (const orderId of ["fs-123456", "Fs-123456", "fS-123456", " FS-123456 "]) {
    assert.equal(parseLookupBody({ orderId, email: "a@b.com" })?.orderId, "FS-123456");
  }
  assert.equal(parseLookupBody({ orderId: "checkout_AbC123", email: "a@b.com" })?.orderId, "checkout_AbC123");
});
