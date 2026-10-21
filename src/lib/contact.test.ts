import test from "node:test";
import assert from "node:assert/strict";
import { CONTACT, productEnquiryHref, productWhatsAppHref, productEnquiryLinks } from "./contact";

test("contact constants keep their published values", () => {
  assert.equal(CONTACT.phoneDisplay, "0423 936 586");
  assert.equal(CONTACT.phoneHref, "tel:+61423936586");
  assert.equal(CONTACT.phoneE164, "+61423936586");
  assert.equal(CONTACT.email, "info@freshstop.com.au");
  assert.ok(CONTACT.whatsappHref.startsWith("https://wa.me/61423936586"));
});
test("product hrefs URL-encode names such as 'Bok choy & kale'", () => {
  const name = "Bok choy & kale";
  const text = encodeURIComponent(`Hello Fresh Stop, I would like to enquire about ${name}.`);
  assert.equal(productWhatsAppHref(name), `https://wa.me/61423936586?text=${text}`);
  assert.ok(productWhatsAppHref(name).includes("Bok%20choy%20%26%20kale"));
  assert.ok(!productWhatsAppHref(name).includes("& kale"));
  const mail = productEnquiryHref(name);
  assert.ok(mail.startsWith("mailto:info@freshstop.com.au?subject="));
  assert.ok(mail.includes("Bok%20choy%20%26%20kale"));
  assert.deepEqual(productEnquiryLinks(name), { whatsapp: productWhatsAppHref(name), email: mail });
});
test("hrefs never mention prices, orders or confirmations", () => {
  for (const href of [productWhatsAppHref("Apples"), productEnquiryHref("Apples")]) {
    assert.doesNotMatch(decodeURIComponent(href), /price|\$|checkout|order|confirm/i);
  }
});
