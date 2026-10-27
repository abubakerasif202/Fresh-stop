import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldShowFloatingWhatsApp } from "./whatsapp-visibility";

describe("shouldShowFloatingWhatsApp", () => {
  it("hides the floating button where full-width checkout controls scroll under it", () => {
    for (const path of ["/cart", "/cart/", "/checkout", "/checkout/review"]) {
      assert.equal(shouldShowFloatingWhatsApp(path), false, path);
    }
  });

  it("keeps it on browsing and enquiry pages", () => {
    for (const path of ["/", "/products", "/products/fresh-carrots", "/contact", "/wholesale", "/carton-deals"]) {
      assert.equal(shouldShowFloatingWhatsApp(path), true, path);
    }
  });

  it("shows it when the pathname is unknown", () => {
    assert.equal(shouldShowFloatingWhatsApp(null), true);
  });
});
