import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_MAX_PRICE_CENTS, PRICING_CSV_HEADERS, bulkConfirmationPhrase, commerceState, csvCell, marketRefsFor,
  parseDollarsToCents, pricingExportRow, purchasableBlockers, type ExportProduct
} from "./admin-pricing";
import { checkTransition, nextStatuses, assertNoPaymentFields } from "./admin-orders";
import { legacyFloats, parsePostcodes, validateZoneInput, NO_FREE_DELIVERY_LEGACY } from "./admin-delivery";
import { AdminHttpError } from "./admin-audit";

test("typed dollars become integer cents without float drift and respect the sanity cap", () => {
  assert.deepEqual(parseDollarsToCents("4.50"), { ok: true, cents: 450 });
  assert.deepEqual(parseDollarsToCents("$0.07"), { ok: true, cents: 7 });
  assert.deepEqual(parseDollarsToCents(19.99), { ok: true, cents: 1999 });
  assert.deepEqual(parseDollarsToCents("500"), { ok: true, cents: ADMIN_MAX_PRICE_CENTS });
  for (const bad of ["0", "0.00", "-1", "abc", "", "1.234", "500.01", "1e3", null, undefined, NaN]) {
    assert.equal(parseDollarsToCents(bad).ok, false, String(bad));
  }
});

test("CSV cells neutralise formula injection and quote special characters", () => {
  for (const attack of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\tTAB", "=HYPERLINK(\"http://x\")"]) {
    assert.ok(csvCell(attack).replace(/^"/, "").startsWith("'"), attack);
  }
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell(null), "");
});

const exportProduct = (over: Partial<ExportProduct> = {}): ExportProduct => ({
  id: "p1", slug: "no-such-dataset-slug", name: "Apple", unit: "kg", taxCategory: "GST_FREE", taxCategoryApprovedBy: "alice", taxCategoryApprovedAt: null, availabilityStatus: "UNKNOWN",
  isPurchasable: false, priceApprovedAt: null, category: { name: "Fruit" }, approvalStatus: "PENDING", priceApprovedBy: null,
  priceCents: null, suggestedPriceCents: 450, stockVerified: false, stockQuantity: null, ...over
});

test("pricing CSV never includes cost price or market prices, and neutralises names", () => {
  assert.ok(!PRICING_CSV_HEADERS.some((h) => /cost|market/i.test(h)));
  const row = pricingExportRow(exportProduct({ name: "=cmd|calc" }), [
    { id: "r1", kind: "OBSERVED", retailer: "X", packSize: null, priceCents: 299, sourceUrl: "https://example.test", observedAt: "2026-10-20" },
    { id: "r2", kind: "ESTIMATE", retailer: "Y", packSize: null, priceCents: 399, sourceUrl: null, observedAt: null }
  ]);
  assert.match(row, /'=cmd\|calc/);
  assert.ok(!row.includes("2.99") && !row.includes("3.99"), "reference prices are not exported");
  assert.match(row, /,1,1$/, "observed and estimate counts exported");
});

test("pricing export preserves unsupported tax values for owner review", () => {
  const row = pricingExportRow(exportProduct({ taxCategory: "UNKNOWN_RATE" }), []);
  assert.match(row, /UNRECOGNIZED \(UNKNOWN_RATE\)/);
  assert.equal(commerceState({ approvalStatus: "APPROVED", priceApprovedBy: "owner", priceCents: 100, suggestedPriceCents: null, stockVerified: true, stockQuantity: 1, taxCategory: "UNKNOWN_RATE", taxCategoryApprovedBy: "owner", taxCategoryApprovedAt: new Date() }), "MISSING_CONFIGURATION");
});

test("four-state commerce badge", () => {
  const base = { approvalStatus: "PENDING", priceApprovedBy: null, priceCents: null, suggestedPriceCents: null, stockVerified: false, stockQuantity: null, taxCategory: "GST_FREE", taxCategoryApprovedBy: null, taxCategoryApprovedAt: null as Date | null };
  assert.equal(commerceState({ ...base, suggestedPriceCents: 300 }), "SUGGESTED");
  assert.equal(commerceState({ ...base, priceCents: 300 }), "PENDING_APPROVAL");
  assert.equal(commerceState(base), "MISSING_CONFIGURATION");
  const approved = { ...base, approvalStatus: "APPROVED", priceApprovedBy: "alice", priceCents: 300, taxCategoryApprovedBy: "alice", taxCategoryApprovedAt: new Date() };
  assert.equal(commerceState(approved), "MISSING_CONFIGURATION", "approved price without verified stock is not complete");
  assert.equal(commerceState({ ...approved, stockVerified: true, stockQuantity: 5 }), "VERIFIED");
});

test("market references: ESTIMATE rows are labelled and never promoted; OBSERVED needs source and date", () => {
  const refs = marketRefsFor({ id: "cmv9l1euu001y116q069ecq4o", slug: "artisanal-sourdough-loaf" });
  assert.ok(refs.length > 0);
  assert.ok(refs.every((r) => r.kind === "ESTIMATE"));
  const db = marketRefsFor({ id: "none", slug: "none" }, [
    { id: "a", competitor: "C", packSize: null, observedPrice: 2.5, sourceUrl: "https://s.test", observedAt: new Date("2026-10-01") },
    { id: "b", competitor: "D", packSize: null, observedPrice: 2.6, sourceUrl: null, observedAt: new Date("2026-10-01") }
  ]);
  assert.deepEqual(db.map((r) => r.kind), ["OBSERVED", "ESTIMATE"]);
});

test("purchasable blockers explain why a product is not eligible", () => {
  const ok = { isPublished: true, isActive: true, approvalStatus: "APPROVED", priceApprovedBy: "a", priceCents: 100, taxCategory: "GST_FREE", taxCategoryApprovedBy: "alice", taxCategoryApprovedAt: new Date(), stockVerified: true, stockQuantity: 3, reservedQuantity: 0, availabilityStatus: "IN_STOCK" };
  assert.deepEqual(purchasableBlockers(ok), []);
  assert.equal(purchasableBlockers({ ...ok, stockVerified: false }).length, 1);
  assert.equal(purchasableBlockers({ ...ok, approvalStatus: "PENDING" }).length, 1);
  assert.equal(purchasableBlockers({ ...ok, availabilityStatus: "DISCONTINUED" }).length, 1);
  assert.equal(bulkConfirmationPhrase(3), "APPROVE 3 PRICES");
});

const order = (orderStatus: string, paymentStatus: string, fulfillmentType = "DELIVERY") => ({ orderStatus, paymentStatus, fulfillmentType });

test("order transition table: chain, pickup shortcut, cancel rules", () => {
  const ok = (from: string, to: string, pay = "PAID", type = "DELIVERY") => checkTransition({ from, to, paymentStatus: pay, fulfillmentType: type }).ok;
  assert.ok(ok("RECEIVED", "PREPARING"));
  assert.ok(ok("PREPARING", "READY"));
  assert.ok(ok("READY", "OUT_FOR_DELIVERY"));
  assert.ok(ok("OUT_FOR_DELIVERY", "DELIVERED"));
  assert.ok(ok("READY", "DELIVERED", "PAID", "PICKUP"));
  assert.ok(!ok("READY", "DELIVERED", "PAID", "DELIVERY"));
  assert.ok(!ok("READY", "OUT_FOR_DELIVERY", "PAID", "PICKUP"));
  assert.ok(!ok("RECEIVED", "READY"), "no skipping");
  assert.ok(!ok("DELIVERED", "CANCELLED"), "cannot cancel after delivery");
  assert.ok(!ok("CANCELLED", "RECEIVED"));
  assert.ok(ok("RECEIVED", "CANCELLED") && ok("OUT_FOR_DELIVERY", "CANCELLED"));
  assert.ok(ok("PENDING_PAYMENT", "CANCELLED", "PENDING"));
});

test("unpaid orders cannot enter fulfilment and PAID is never an admin-settable status", () => {
  for (const to of ["RECEIVED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]) {
    assert.equal(checkTransition({ from: "PENDING_PAYMENT", to, paymentStatus: "PENDING", fulfillmentType: "DELIVERY" }).ok, false, to);
  }
  assert.equal(checkTransition({ from: "RECEIVED", to: "PREPARING", paymentStatus: "PENDING", fulfillmentType: "DELIVERY" }).ok, false);
  for (const to of ["PAID", "PENDING_PAYMENT", "REFUNDED", "COMPLETED"]) {
    assert.equal(checkTransition({ from: "RECEIVED", to, paymentStatus: "PAID", fulfillmentType: "DELIVERY" }).ok, false, to);
  }
  assert.deepEqual(nextStatuses(order("PENDING_PAYMENT", "PENDING")), ["CANCELLED"]);
  assert.deepEqual(nextStatuses(order("DELIVERED", "PAID")), []);
});

test("any attempt to set payment fields by hand is rejected", () => {
  for (const key of ["paymentStatus", "paid", "paidAt", "amountPaidCents", "refundedCents"]) {
    assert.throws(() => assertNoPaymentFields({ orderId: "x", [key]: "PAID" }), (e: unknown) => e instanceof AdminHttpError && e.status === 422);
  }
  assert.doesNotThrow(() => assertNoPaymentFields({ orderId: "x", orderStatus: "READY" }));
});

test("delivery postcodes are validated, de-duplicated and sorted", () => {
  assert.deepEqual(parsePostcodes("2216, 2000 2216;2100"), { ok: true, postcodes: ["2000", "2100", "2216"] });
  assert.equal(parsePostcodes("2216,abc").ok, false);
  assert.equal(parsePostcodes("123").ok, false);
  assert.equal(parsePostcodes("12345").ok, false);
  assert.equal(parsePostcodes("").ok, false);
});

test("zone validation accepts only integer cents and derives legacy floats", () => {
  const bad = validateZoneInput({ name: "A", postcodes: "2000", primaryBranchSlug: "x", deliveryFeeCents: 9.5 }, false);
  assert.equal(bad.ok, false);
  const good = validateZoneInput({ name: "Zone", postcodes: "2000", primaryBranchSlug: "rockdale", deliveryFeeCents: 950, freeDeliveryMinCents: null }, false);
  assert.equal(good.ok, true);
  assert.deepEqual(legacyFloats({ deliveryFeeCents: 950, freeDeliveryMinCents: null, minOrderCents: null }), { deliveryFee: 9.5, freeDeliveryMinSpend: NO_FREE_DELIVERY_LEGACY, minOrderAmount: 0 });
  assert.equal(legacyFloats({ deliveryFeeCents: 0, freeDeliveryMinCents: 15000, minOrderCents: 5000 }).freeDeliveryMinSpend, 150);
});
