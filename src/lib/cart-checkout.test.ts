import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_FORM,
  buildCheckoutPayload,
  interpretCheckoutResponse,
  isStripeCheckoutUrl,
  nextIdempotencyKey,
  parseDeliveryResponse,
  validateCheckoutForm,
  type CheckoutForm
} from "./cart-checkout";
import { addLine } from "./cart-core";
import { parseRefreshResponse } from "./cart-refresh";
import { buildRefreshResults, parseRefreshRequest, type RefreshProductRow } from "./cart-refresh-server";

const valid: CheckoutForm = { ...EMPTY_FORM, name: "Sarah Jenkins", email: "sarah@example.com.au", phone: "0412 345 678", address: "12 King Street", suburb: "Rockdale", postcode: "2216" };
const lines = addLine([], { productId: "p1", slug: "apple", name: "Apple", unit: "kg", imageUrl: "/products/a.webp", imageAlt: null, priceCents: 399 }, 2);

describe("checkout form validation", () => {
  it("accepts a complete delivery form and a complete pickup form", () => {
    assert.deepEqual(validateCheckoutForm(valid), {});
    assert.deepEqual(validateCheckoutForm({ ...EMPTY_FORM, fulfillmentType: "PICKUP", name: "Sam Lee", email: "sam@example.com", phone: "+61 412 345 678" }), {});
  });

  it("reports each invalid field", () => {
    const errors = validateCheckoutForm({ ...valid, name: "A", email: "nope", phone: "123", address: "x", suburb: "", postcode: "22" });
    assert.deepEqual(Object.keys(errors).sort(), ["address", "email", "name", "phone", "postcode", "suburb"]);
  });

  it("does not require an address for pickup", () => {
    assert.equal(validateCheckoutForm({ ...valid, fulfillmentType: "PICKUP", address: "", suburb: "", postcode: "" }).address, undefined);
  });
});

describe("checkout payload", () => {
  it("sends only an explicit backorder acknowledgement and maps the server notice", () => {
    assert.equal(buildCheckoutPayload(lines, valid, "key-12345678").backorderAcknowledged, false);
    assert.equal(buildCheckoutPayload(lines, { ...valid, backorderAcknowledged: true }, "key-12345678").backorderAcknowledged, true);
    const result = interpretCheckoutResponse(400, { code: "VALIDATION", error: "Acknowledge backorders", details: { backorderAcknowledged: "Apples are backordered" } });
    assert.equal(result.kind, "validation");
    if (result.kind === "validation") assert.equal(result.fieldErrors.backorderAcknowledged, "Apples are backordered");
  });
  it("sends product references and an expected-price guard, never trusting client totals", () => {
    const payload = buildCheckoutPayload(lines, valid, "key-12345678");
    assert.deepEqual(payload.items, [{ productId: "p1", slug: "apple", quantity: 2, expectedPriceCents: 399 }]);
    assert.equal(payload.idempotencyKey, "key-12345678");
    assert.equal("total" in payload, false);
    assert.equal(payload.customer.postcode, "2216");
  });

  it("uses the chosen pickup branch for pickup orders", () => {
    const payload = buildCheckoutPayload(lines, { ...valid, fulfillmentType: "PICKUP", branch: "riverwood" }, "key-12345678");
    assert.equal(payload.pickupBranchSlug, "riverwood");
    assert.equal(payload.customer.postcode, "2210");
  });
});

describe("idempotency key reuse", () => {
  it("reuses the key for an identical retry and creates a new one when the request changes", () => {
    let n = 0;
    const make = () => `key-${++n}`;
    const first = nextIdempotencyKey(null, "a", make);
    const retry = nextIdempotencyKey(first, "a", make);
    const changed = nextIdempotencyKey(retry, "b", make);
    assert.equal(retry.key, first.key);
    assert.notEqual(changed.key, first.key);
    assert.equal(n, 2);
  });
});

describe("redirect and response handling", () => {
  it("follows only https checkout.stripe.com URLs", () => {
    assert.equal(isStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_test_123"), true);
    for (const bad of ["http://checkout.stripe.com/x", "https://checkout.stripe.com.evil.com/x", "https://evil.com/?https://checkout.stripe.com", "javascript:alert(1)", "https://user:pw@checkout.stripe.com/x", "//checkout.stripe.com", "", null, 5]) {
      assert.equal(isStripeCheckoutUrl(bad), false, String(bad));
    }
  });

  it("refuses to redirect on a 200 with a non-Stripe url", () => {
    assert.equal(interpretCheckoutResponse(200, { url: "https://evil.example/pay" }).kind, "error");
    assert.equal(interpretCheckoutResponse(200, {}).kind, "error");
    assert.deepEqual(interpretCheckoutResponse(200, { url: "https://checkout.stripe.com/c/pay/x" }), { kind: "redirect", url: "https://checkout.stripe.com/c/pay/x" });
  });

  it("preserves pickup branch validation and avoids claiming uncertain payments were not charged", () => {
    const invalid = interpretCheckoutResponse(400, { details: { pickupBranchSlug: "Choose a pickup store." } });
    assert.equal(invalid.kind, "validation");
    if (invalid.kind === "validation") assert.deepEqual(invalid.fieldErrors, { branch: "Choose a pickup store." });
    for (const [status, body] of [[200, {}], [500, null], [502, null]] as const) {
      const outcome = interpretCheckoutResponse(status, body);
      assert.equal(outcome.kind, "error");
      if (outcome.kind === "error") assert.doesNotMatch(outcome.message, /nothing has been charged/i);
    }
  });

  it("handles 400, 409, 429 and 503 distinctly", () => {
    const v = interpretCheckoutResponse(400, { error: "Please check the highlighted details.", details: { email: "Bad email", preferredDeliveryDate: "Bad date", unknown: "x" } });
    assert.equal(v.kind, "validation");
    if (v.kind === "validation") assert.deepEqual(v.fieldErrors, { email: "Bad email", preferredDate: "Bad date" });
    const c = interpretCheckoutResponse(409, { code: "CONFLICT", conflicts: [{ productId: "p1", reason: "OUT_OF_STOCK" }, { nope: true }] });
    assert.deepEqual(c, { kind: "conflict", conflicts: [{ productId: "p1", reason: "OUT_OF_STOCK" }] });
    assert.equal(interpretCheckoutResponse(409, { code: "IDEMPOTENCY_KEY_USED" }).kind, "key-used");
    assert.equal(interpretCheckoutResponse(409, { code: "IDEMPOTENCY_IN_PROGRESS" }).kind, "error", "keep the same key while the first request starts");
    assert.equal(interpretCheckoutResponse(429, {}).kind, "rate-limited");
    assert.deepEqual(interpretCheckoutResponse(503, { code: "CHECKOUT_DISABLED" }), { kind: "unavailable", code: "CHECKOUT_DISABLED" });
    assert.equal(interpretCheckoutResponse(500, null).kind, "error");
    assert.equal(interpretCheckoutResponse(502, null).kind, "error");
  });
});

describe("delivery response parsing", () => {
  it("reads only integer-cent fields and ignores legacy invented dollar fields", () => {
    const info = parseDeliveryResponse({ eligible: true, message: "ok", deliveryFeeCents: 800, freeDeliveryMinCents: null, minOrderCents: 3000, deliveryFee: 9.99, minOrderAmount: 50 });
    assert.deepEqual(info, { checked: true, eligible: true, message: "ok", feeCents: 800, minOrderCents: 3000, freeDeliveryMinCents: null });
    const legacy = parseDeliveryResponse({ eligible: true, deliveryFee: 9.99, minOrderAmount: 50, freeDeliveryThreshold: 150 });
    assert.equal(legacy.feeCents, null);
    assert.equal(legacy.minOrderCents, null);
    assert.equal(parseDeliveryResponse("garbage").eligible, false);
  });
});

const row = (over: Partial<RefreshProductRow> = {}): RefreshProductRow => ({
  id: "p1", isPublished: true, isActive: true, isPurchasable: true, approvalStatus: "APPROVED", priceApprovedBy: "owner",
  priceCents: 450, taxCategory: "GST_FREE", taxCategoryApprovedBy: "owner", taxCategoryApprovedAt: new Date(), stockVerified: true, stockQuantity: 10, reservedQuantity: 2, availabilityStatus: "IN_STOCK", ...over
});

describe("cart refresh API logic", () => {
  it("validates requests: bounds, shape, duplicates", () => {
    assert.deepEqual(parseRefreshRequest({ items: [{ productId: "a", quantity: 2 }, { productId: "a", quantity: 3 }, { productId: "b" }] }), [{ productId: "a", quantity: 2 }, { productId: "b", quantity: 1 }]);
    for (const bad of [null, {}, { items: [] }, { items: "x" }, { items: [{ productId: "" }] }, { items: [{ productId: "a", quantity: 0 }] }, { items: [{ productId: "a", quantity: 1.5 }] }, { items: Array.from({ length: 51 }, (_, i) => ({ productId: `p${i}` })) }]) {
      assert.equal(parseRefreshRequest(bad), null);
    }
  });

  it("reveals the price only for purchasable products and never exposes stock counts", () => {
    const results = buildRefreshResults(
      [{ productId: "p1", quantity: 3 }, { productId: "p2", quantity: 1 }, { productId: "p3", quantity: 20 }, { productId: "gone", quantity: 1 }],
      [row(), row({ id: "p2", stockVerified: false }), row({ id: "p3" })]
    );
    assert.deepEqual(results[0], { productId: "p1", purchasable: true, priceCents: 450, reason: null });
    assert.deepEqual(results[1], { productId: "p2", purchasable: false, priceCents: null, reason: "STOCK_UNVERIFIED" });
    assert.deepEqual(results[2], { productId: "p3", purchasable: false, priceCents: null, reason: "INSUFFICIENT_STOCK" });
    assert.deepEqual(results[3], { productId: "gone", purchasable: false, priceCents: null, reason: "NOT_FOUND" });
    assert.equal(JSON.stringify(results).includes("stock\":"), false);
  });

  it("client parser accepts the server shape and rejects malformed bodies", () => {
    const ok = buildRefreshResults([{ productId: "p1", quantity: 1 }], [row()]);
    assert.deepEqual(parseRefreshResponse({ items: ok }), ok);
    assert.equal(parseRefreshResponse({ items: [{ productId: "p1", purchasable: "yes", priceCents: 1 }] }), null);
    assert.equal(parseRefreshResponse({ items: [{ productId: "p1", purchasable: true, priceCents: 1.5 }] }), null);
    assert.equal(parseRefreshResponse(null), null);
  });
});
