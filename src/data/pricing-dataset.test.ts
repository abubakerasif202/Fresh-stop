import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { catalogueCandidates } from "./catalogue-candidates";
import { assertSafePricingDataset, buildMarketReferences, buildPricingDataset, parseSizeToken, pricingViolations, type MarketReference, type PricingEntry, type PricingEstimate } from "./pricing-build";

const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "src/data", name), "utf8")) as T;
const dataset = read<PricingEntry[]>("sydney-pricing-dataset.json");
const refs = read<MarketReference[]>("market-references.json");
const estimates = read<Record<string, PricingEstimate>>("pricing-estimates.json");
const observed = read<MarketReference[]>("market-observations.json");
const baseline = read<{ products: { id: string; slug: string; name: string; category: { slug: string } }[] }>("catalogue-baseline.json");

const sources = [
  ...baseline.products.map(p => ({ id: p.id, slug: p.slug, name: p.name, categorySlug: p.category.slug, origin: "BASELINE" as const })),
  ...catalogueCandidates.map(c => ({ id: `staged-${c.slug}`, slug: c.slug, name: c.name, categorySlug: c.categorySlug, origin: "CANDIDATE" as const }))
];

test("committed dataset has no safety violations", () => {
  assert.deepEqual(pricingViolations(dataset, refs), []);
});

test("no entry is APPROVED, purchasable, priced for sale, costed or stocked", () => {
  for (const e of dataset) {
    assert.equal(e.approvalStatus, "PENDING", e.slug);
    assert.equal(e.priceApprovedBy, null, e.slug);
    assert.equal(e.isPurchasable, false, e.slug);
    assert.equal(e.priceCents, null, e.slug);
    assert.equal(e.approvedSellingPrice, null, e.slug);
    assert.equal(e.priceSource, "SUGGESTED", e.slug);
    assert.equal(e.availabilityStatus, "UNKNOWN", e.slug);
    assert.equal(e.stockVerified, false, e.slug);
    assert.equal("costPrice" in e, false, e.slug);
    assert.equal(e.compareAtApproved, false, e.slug);
  }
});

test("ids and slugs are unique and cover baseline plus candidates", () => {
  assert.equal(new Set(dataset.map(e => e.slug)).size, dataset.length);
  assert.equal(new Set(dataset.map(e => e.productId)).size, dataset.length);
  assert.equal(dataset.length, new Set(sources.map(s => s.slug)).size);
});

test("suggested cents are integers and unit prices are consistent with pack size", () => {
  for (const e of dataset) {
    if (e.suggestedPriceCents === null) continue;
    assert.ok(Number.isInteger(e.suggestedPriceCents), e.slug);
    assert.equal(e.suggestedUnitPriceCents, Math.round(e.suggestedPriceCents / e.packageQuantity), e.slug);
  }
});

test("regenerating from sources reproduces the committed files exactly", () => {
  const rebuilt = buildPricingDataset(sources, estimates);
  assert.deepEqual(rebuilt, dataset);
  assert.deepEqual(buildMarketReferences(rebuilt, estimates, observed), refs);
});

test("market references: estimates carry no source, observations carry URL and date", () => {
  for (const r of refs) {
    if (r.kind === "ESTIMATE") { assert.equal(r.sourceUrl, null); assert.equal(r.confidence, "LOW"); assert.equal(r.observedAt, null); }
    else { assert.match(r.sourceUrl ?? "", /^https:\/\//); assert.match(r.observedAt ?? "", /^\d{4}-\d{2}-\d{2}$/); assert.ok((r.price ?? 0) > 0); }
  }
  assert.ok(refs.some(r => r.kind === "OBSERVED"));
});

test("products carry no market or competitor fields", () => {
  for (const e of dataset) for (const k of ["sydneyMarketRefPrice", "competitorSource", "sourceUrl", "marketPrice", "marketSource", "stock"]) assert.equal(k in e, false, `${e.slug}.${k}`);
});

test("the safety checker rejects unsafe entries", () => {
  const bad = { ...dataset[0], approvalStatus: "APPROVED", priceApprovedBy: null, costPrice: 1, stockQuantity: 150, stockVerified: false, isPurchasable: true };
  const errors = pricingViolations([bad, { ...bad }], []);
  for (const re of [/APPROVED without approver/, /costPrice must not exist/, /stock>0 without stockVerified/, /duplicate slug/, /duplicate productId/]) assert.ok(errors.some(e => re.test(e)), String(re));
  assert.throws(() => assertSafePricingDataset([bad], []), /Unsafe pricing dataset/);
  const badRef = { id: "x", productId: dataset[0].productId, retailer: "R", productMatch: "m", packSize: "1kg", price: 1, unitPrice: null, sourceUrl: null, observedAt: null, confidence: "HIGH", kind: "OBSERVED" } as const;
  assert.ok(pricingViolations([], [badRef]).length > 0);
});

test("flagged entries are explained and size parsing normalises units", () => {
  for (const e of dataset) assert.equal(e.needsReview, e.reviewReasons.length > 0, e.slug);
  assert.deepEqual(parseSizeToken("1.25L bottle"), { value: 1250, unit: "ml" });
  assert.deepEqual(parseSizeToken("1kg bag"), { value: 1000, unit: "g" });
  assert.equal(parseSizeToken("kg"), null);
  assert.ok(dataset.find(e => e.slug === "free-range-eggs-dozen")?.needsReview);
});
