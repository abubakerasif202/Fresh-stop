/**
 * Deterministic builder for the Fresh Stop pricing SUGGESTION dataset.
 *
 * Safety contract (enforced again by assertSafePricingDataset and by tests):
 *  - every price is a suggestion: approvalStatus PENDING, priceSource SUGGESTED, no approver, not purchasable
 *  - no costPrice, no stock figures, availability UNKNOWN
 *  - market/competitor numbers live ONLY in market references, never on a product
 *  - the builder reads no clock and no environment, so regeneration is byte-identical
 */

export interface PackSize { value: number; unit: "g" | "ml" }
export type UnitBasis = "PER_KG" | "PER_L" | "PER_ITEM" | "PER_EACH";
export type TaxCategory = "GST_FREE" | "TAXABLE_10";
export type TaxReview = "PROVISIONAL_UNPROCESSED_FOOD" | "NEEDS_ACCOUNTANT_CONFIRMATION";

export interface PricingEstimate {
  unit: string;
  packageQuantity: number;
  suggestedPrice: number;
  gst: TaxCategory;
  legacyMarketEstimate: number;
  legacyMarketLabel: string;
}

export interface SourceProduct { id: string; slug: string; name: string; categorySlug: string; origin: "BASELINE" | "CANDIDATE" }

export interface PricingEntry {
  productId: string;
  slug: string;
  name: string;
  categorySlug: string;
  origin: "BASELINE" | "CANDIDATE";
  unit: string;
  packSize: PackSize | null;
  packageQuantity: number;
  unitBasis: UnitBasis;
  suggestedPriceCents: number | null;
  suggestedUnitPriceCents: number | null;
  suggestedUnitPriceDisplay: string | null;
  priceSource: "SUGGESTED";
  suggestionBasis: "UNVERIFIED_ESTIMATE";
  approvedSellingPrice: null;
  priceCents: null;
  unitPriceCents: null;
  approvalStatus: "PENDING";
  priceApprovedBy: null;
  priceApprovedAt: null;
  isPurchasable: false;
  compareAtApproved: false;
  compareAtPriceCents: null;
  stockQuantity: null;
  stockVerified: false;
  availabilityStatus: "UNKNOWN";
  taxCategory: TaxCategory;
  taxReview: TaxReview;
  needsReview: boolean;
  reviewReasons: string[];
}

export interface MarketReference {
  id: string;
  productId: string;
  retailer: string;
  productMatch: string;
  packSize: string;
  price: number | null;
  unitPrice: string | null;
  sourceUrl: string | null;
  observedAt: string | null;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  kind: "OBSERVED" | "ESTIMATE";
}

const BRAND_TOKENS = new Set(["baducci", "hecham", "viya", "shan", "wagh", "bakri", "katoomba", "antoniou", "saxa", "parle", "s", "w"]);
const FORM_TOKENS = new Set(["frozen", "canned", "water", "seed", "powder", "flour", "juice"]);
const STOPWORDS = new Set(["fresh", "local", "australian", "crisp", "farm"]);
const GENERIC_SLUGS = new Set(["nuts", "bottled-drinks", "sauces", "spice-mixes", "noodles", "coffee", "pickles", "fruit-juice", "cooking-oil", "pasta"]);
const FRESH_CATEGORIES = new Set(["fruits", "vegetables", "leafy-greens", "herbs", "specialty-produce"]);
const UNPROCESSED_STAPLES = new Set(["basmati-rice", "brown-rice", "plain-flour", "self-raising-flour", "jowar-flour", "besan-flour", "urad-flour", "barley", "red-lentils", "chickpeas", "black-eye-beans", "mung-beans", "kidney-beans", "farm-full-cream-milk-2l", "free-range-eggs-dozen"]);
const SIZE_UNITS_WITHOUT_SIZE = new Set(["punnet", "half"]);

const singular = (w: string): string => (w.endsWith("ies") ? `${w.slice(0, -3)}y` : w.endsWith("oes") ? w.slice(0, -2) : w.endsWith("ss") || w.endsWith("us") ? w : w.endsWith("s") ? w.slice(0, -1) : w);

function tokens(name: string): Set<string> {
  return new Set(name.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w && !STOPWORDS.has(w)).map(singular));
}

/** First "<number><g|kg|ml|l>" size in text, normalised to grams or millilitres; null when absent. */
export function parseSizeToken(text: string): PackSize | null {
  const m = /(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  if (u === "kg") return { value: n * 1000, unit: "g" };
  if (u === "g") return { value: n, unit: "g" };
  if (u === "l") return { value: n * 1000, unit: "ml" };
  return { value: n, unit: "ml" };
}

export type DuplicateKind = "BRAND_VARIANT" | "FORM_VARIANT" | "VARIETY_OR_DUPLICATE";
export interface NearDuplicate { a: string; b: string; kind: DuplicateKind }

/** Pairs where the tokens of one name are a proper subset of (or equal to) the other's. */
export function nearDuplicatePairs(items: readonly { slug: string; name: string }[]): NearDuplicate[] {
  const toks = items.map(i => ({ slug: i.slug, t: tokens(i.name) }));
  const out: NearDuplicate[] = [];
  for (const x of toks) for (const y of toks) {
    if (x.slug >= y.slug || x.t.size === 0 || y.t.size === 0) continue;
    const [small, big] = x.t.size <= y.t.size ? [x, y] : [y, x];
    if (![...small.t].every(w => big.t.has(w))) continue;
    const extra = [...big.t].filter(w => !small.t.has(w));
    const kind: DuplicateKind = extra.some(w => BRAND_TOKENS.has(w)) ? "BRAND_VARIANT" : extra.some(w => FORM_TOKENS.has(w)) ? "FORM_VARIANT" : "VARIETY_OR_DUPLICATE";
    out.push({ a: small.slug, b: big.slug, kind });
  }
  return out.sort((p, q) => (p.a + p.b).localeCompare(q.a + q.b));
}

interface UnitInfo { basis: UnitBasis; packSize: PackSize | null; quantity: number }

function describeUnit(unit: string): UnitInfo {
  const size = parseSizeToken(unit);
  if (size) return { basis: size.unit === "g" ? "PER_KG" : "PER_L", packSize: size, quantity: size.value / 1000 };
  if (unit === "kg") return { basis: "PER_KG", packSize: null, quantity: 1 };
  const count = /^(\d+) pack$/.exec(unit);
  if (count) return { basis: "PER_ITEM", packSize: null, quantity: Number(count[1]) };
  return { basis: "PER_EACH", packSize: null, quantity: 1 };
}

const dollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

function unitPriceDisplay(basis: UnitBasis, cents: number): string {
  if (basis === "PER_KG") return `${dollars(cents)}/kg`;
  if (basis === "PER_L") return `${dollars(cents)}/L`;
  if (basis === "PER_ITEM") return `${dollars(cents)}/item`;
  return `${dollars(cents)} each`;
}

function taxReviewFor(source: SourceProduct, gst: TaxCategory): TaxReview {
  const fresh = FRESH_CATEGORIES.has(source.categorySlug) || UNPROCESSED_STAPLES.has(source.slug);
  return fresh && gst === "GST_FREE" ? "PROVISIONAL_UNPROCESSED_FOOD" : "NEEDS_ACCOUNTANT_CONFIRMATION";
}

function sizeReasons(source: SourceProduct, unit: string, info: UnitInfo): string[] {
  const out: string[] = [];
  for (const [label, text] of [["name", source.name], ["slug", source.slug.replace(/-/g, " ")]] as const) {
    const s = parseSizeToken(text);
    if (!s) continue;
    if (!info.packSize) out.push(`${label} states ${s.value}${s.unit} but unit "${unit}" has no pack size`);
    else if (s.unit !== info.packSize.unit || Math.abs(s.value - info.packSize.value) > 1e-9) out.push(`${label} states ${s.value}${s.unit} but unit is "${unit}"`);
  }
  if (/-head$/.test(source.slug) && unit !== "head") out.push(`slug says head but unit is "${unit}"`);
  if (/dozen/.test(source.slug) && unit !== "12 pack") out.push(`slug says dozen but unit is "${unit}"`);
  if (SIZE_UNITS_WITHOUT_SIZE.has(unit)) out.push(`unit "${unit}" has no determinable size`);
  return out;
}

function duplicateReasons(source: SourceProduct, pairs: readonly NearDuplicate[], bySlug: ReadonlyMap<string, SourceProduct>, unitOf: (slug: string) => string): string[] {
  const out: string[] = [];
  for (const p of pairs) {
    if (p.a !== source.slug && p.b !== source.slug) continue;
    const other = bySlug.get(p.a === source.slug ? p.b : p.a);
    if (!other || p.kind === "FORM_VARIANT") continue;
    if (p.kind === "VARIETY_OR_DUPLICATE" && unitOf(other.slug) !== unitOf(source.slug)) continue;
    out.push(`${p.kind === "BRAND_VARIANT" ? "brand variant of or overlaps" : "possible duplicate of or variety overlapping"} ${other.slug}`);
    if (other.categorySlug !== source.categorySlug) out.push(`category differs from related product ${other.slug} (${other.categorySlug})`);
  }
  return out;
}

export function buildPricingDataset(sources: readonly SourceProduct[], estimates: Readonly<Record<string, PricingEstimate>>): PricingEntry[] {
  const unique = [...new Map(sources.map(s => [s.slug, s])).values()];
  const bySlug = new Map(unique.map(s => [s.slug, s]));
  const pairs = nearDuplicatePairs(unique);
  const unitOf = (slug: string) => estimates[slug]?.unit ?? "";
  return unique.map(source => {
    const est = estimates[source.slug];
    const reasons: string[] = [];
    const unit = est?.unit ?? "each";
    const info = describeUnit(unit);
    if (!est) reasons.push("no pricing estimate: unit, size and price unknown");
    const cents = est ? Math.round(est.suggestedPrice * 100) : null;
    const unitCents = cents === null ? null : Math.round(cents / info.quantity);
    if (GENERIC_SLUGS.has(source.slug)) reasons.push("generic product name: brand, variety and pack size not determinable");
    reasons.push(...sizeReasons(source, unit, info), ...duplicateReasons(source, pairs, bySlug, unitOf));
    const gst = est?.gst ?? "GST_FREE";
    return {
      productId: source.id, slug: source.slug, name: source.name, categorySlug: source.categorySlug, origin: source.origin,
      unit, packSize: info.packSize, packageQuantity: info.quantity, unitBasis: info.basis,
      suggestedPriceCents: cents, suggestedUnitPriceCents: unitCents,
      suggestedUnitPriceDisplay: unitCents === null ? null : unitPriceDisplay(info.basis, unitCents),
      priceSource: "SUGGESTED", suggestionBasis: "UNVERIFIED_ESTIMATE",
      approvedSellingPrice: null, priceCents: null, unitPriceCents: null,
      approvalStatus: "PENDING", priceApprovedBy: null, priceApprovedAt: null, isPurchasable: false,
      compareAtApproved: false, compareAtPriceCents: null,
      stockQuantity: null, stockVerified: false, availabilityStatus: "UNKNOWN",
      taxCategory: gst, taxReview: taxReviewFor(source, gst),
      needsReview: reasons.length > 0, reviewReasons: reasons
    };
  });
}

/** Legacy Antigravity market numbers become ESTIMATE references with no source; observed rows are appended verbatim. */
export function buildMarketReferences(
  entries: readonly PricingEntry[],
  estimates: Readonly<Record<string, PricingEstimate>>,
  observed: readonly MarketReference[]
): MarketReference[] {
  const estimateRefs: MarketReference[] = entries.flatMap(e => {
    const est = estimates[e.slug];
    if (!est) return [];
    return [{
      id: `est-${e.slug}`, productId: e.productId, retailer: est.legacyMarketLabel, productMatch: e.name, packSize: e.unit,
      price: est.legacyMarketEstimate, unitPrice: null, sourceUrl: null, observedAt: null, confidence: "LOW", kind: "ESTIMATE"
    } satisfies MarketReference];
  });
  return [...estimateRefs, ...observed];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function checkEntry(e: Record<string, unknown>, errors: string[]): void {
  const id = String(e.slug);
  if ("costPrice" in e) errors.push(`${id}: costPrice must not exist`);
  if (e.approvalStatus === "APPROVED" && !e.priceApprovedBy) errors.push(`${id}: APPROVED without approver`);
  if (e.approvalStatus !== "PENDING" && !e.priceApprovedBy) errors.push(`${id}: non-PENDING without approver`);
  if (typeof e.stockQuantity === "number" && e.stockQuantity > 0 && e.stockVerified !== true) errors.push(`${id}: stock>0 without stockVerified`);
  if (e.isPurchasable === true && !e.priceApprovedBy) errors.push(`${id}: purchasable without approver`);
  if (e.priceSource === "SUGGESTED" && (e.priceCents !== null || e.approvedSellingPrice !== null)) errors.push(`${id}: SUGGESTED price must not be an approved price`);
  if (e.compareAtApproved !== true && e.compareAtPriceCents !== null && e.compareAtPriceCents !== undefined) errors.push(`${id}: compareAt without compareAtApproved`);
  for (const k of ["suggestedPriceCents", "suggestedUnitPriceCents"]) if (e[k] !== null && !Number.isInteger(e[k])) errors.push(`${id}: ${k} must be integer cents`);
  if (e.taxCategory !== "GST_FREE" && e.taxCategory !== "TAXABLE_10") errors.push(`${id}: invalid taxCategory`);
}

function checkReference(r: MarketReference, productIds: ReadonlySet<string>, errors: string[]): void {
  if (!productIds.has(r.productId)) errors.push(`${r.id}: unknown productId`);
  if (r.kind === "ESTIMATE" && (r.sourceUrl !== null || r.confidence !== "LOW" || r.observedAt !== null)) errors.push(`${r.id}: ESTIMATE must have no sourceUrl/observedAt and LOW confidence`);
  if (r.kind === "OBSERVED") {
    if (!r.sourceUrl || !/^https:\/\//.test(r.sourceUrl)) errors.push(`${r.id}: OBSERVED needs an https sourceUrl`);
    if (!r.observedAt || !ISO_DATE.test(r.observedAt)) errors.push(`${r.id}: OBSERVED needs observedAt date`);
    if (typeof r.price !== "number" || !(r.price > 0)) errors.push(`${r.id}: OBSERVED needs a positive price`);
  }
}

/** Returns a list of violations; empty means safe. Used by the generator (throws) and by tests. */
export function pricingViolations(entries: readonly unknown[], refs: readonly MarketReference[]): string[] {
  const errors: string[] = [];
  const rows = entries as Record<string, unknown>[];
  for (const key of ["slug", "productId"]) {
    const seen = new Set<string>();
    for (const e of rows) {
      const v = String(e[key]);
      if (seen.has(v)) errors.push(`duplicate ${key} ${v}`);
      seen.add(v);
    }
  }
  rows.forEach(e => checkEntry(e, errors));
  const ids = new Set(rows.map(e => String(e.productId)));
  const refIds = new Set<string>();
  for (const r of refs) {
    if (refIds.has(r.id)) errors.push(`duplicate market reference id ${r.id}`);
    refIds.add(r.id);
    checkReference(r, ids, errors);
  }
  return errors;
}

export function assertSafePricingDataset(entries: readonly unknown[], refs: readonly MarketReference[]): void {
  const errors = pricingViolations(entries, refs);
  if (errors.length) throw new Error(`Unsafe pricing dataset:\n${errors.join("\n")}`);
}
