import test from "node:test";
import assert from "node:assert/strict";
import { ENQUIRY_LIMITS, HONEYPOT_FIELD, validateEnquiryBody } from "./enquiry-input";

const wholesale = {
  kind: "WHOLESALE",
  name: "  Sam Lee ",
  businessName: "Lee Greengrocer",
  email: "sam@example.com",
  phone: "0423 936 586",
  products: "Tomatoes, onions",
  estimatedQuantity: "20 boxes weekly",
  message: ""
};

test("accepts a valid wholesale enquiry, trims and normalises the phone", () => {
  const result = validateEnquiryBody(wholesale);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.name, "Sam Lee");
  assert.equal(result.value.phone, "0423936586");
  assert.equal(result.value.message, null);
  assert.equal(result.honeypotTripped, false);
});

test("accepts a contact enquiry with a message and no business details", () => {
  const result = validateEnquiryBody({ kind: "CONTACT", name: "Ana", email: "ana@example.com", phone: "+61 423 936 586", message: "Do you open on Sundays?" });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.businessName, null);
});

test("rejects bad kind, email, phone and missing required fields with field errors", () => {
  const result = validateEnquiryBody({ kind: "OTHER", name: "", email: "nope", phone: "12" });
  assert.equal(result.ok, false);
  if (result.ok) return;
  for (const field of ["kind", "name", "email", "phone"]) assert.ok(result.errors[field], field);
});

test("wholesale needs a business name and products; contact needs a message", () => {
  const w = validateEnquiryBody({ ...wholesale, businessName: "", products: "" });
  assert.equal(w.ok, false);
  if (!w.ok) assert.ok(w.errors.businessName && w.errors.products);
  const c = validateEnquiryBody({ kind: "CONTACT", name: "Ana", email: "ana@example.com", phone: "0423936586", message: " " });
  assert.equal(c.ok, false);
  if (!c.ok) assert.ok(c.errors.message);
});

test("enforces length caps and rejects control characters and non-string input", () => {
  const long = validateEnquiryBody({ ...wholesale, message: "x".repeat(ENQUIRY_LIMITS.message + 1) });
  assert.equal(long.ok, false);
  const ctrl = validateEnquiryBody({ ...wholesale, name: "Sam\u0000Lee" });
  assert.equal(ctrl.ok, false);
  const typed = validateEnquiryBody({ ...wholesale, name: { $gt: "" } });
  assert.equal(typed.ok, false);
  assert.equal(validateEnquiryBody(["array"]).ok, false);
  assert.equal(validateEnquiryBody(null).ok, false);
});

test("rejects emails that could inject headers", () => {
  assert.equal(validateEnquiryBody({ ...wholesale, email: "a@b.com\r\nBcc: x@y.com" }).ok, false);
  assert.equal(validateEnquiryBody({ ...wholesale, email: "a@b.com,c@d.com" }).ok, false);
});

test("a filled honeypot is reported without validating the rest", () => {
  const result = validateEnquiryBody({ [HONEYPOT_FIELD]: "http://spam.example", kind: "??" });
  assert.equal(result.ok, false);
  assert.equal("honeypotTripped" in result && result.honeypotTripped, true);
});
