import { getPurchasabilityReason, type PurchasabilityFields, type PurchasabilityReason } from "./purchasability";
import { COMMERCE_STATE_LABEL, MAX_BULK_APPROVE, bulkConfirmationPhrase, type CommerceState } from "./commerce-state-labels";
import marketReferences from "../data/market-references.json";
import marketObservations from "../data/market-observations.json";
import pricingDataset from "../data/sydney-pricing-dataset.json";

/** Sanity cap for a typed selling price: A$500.00. Larger values are almost certainly a decimal-point slip. */
export const ADMIN_MAX_PRICE_CENTS = 50_000;
export const MIN_OVERRIDE_REASON = 10;

export { COMMERCE_STATE_LABEL, MAX_BULK_APPROVE, bulkConfirmationPhrase, type CommerceState };

const UNIT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .×-]{0,29}$/;
export const isValidUnit = (unit: unknown): unit is string => typeof unit === "string" && UNIT_PATTERN.test(unit.trim());

/** Parse a typed dollar amount into integer cents without float drift. Strings and numbers accepted. */
export function parseDollarsToCents(input: unknown): { ok: true; cents: number } | { ok: false; error: string } {
  const raw = typeof input === "number" && Number.isFinite(input) ? input.toFixed(4) : typeof input === "string" ? input.trim() : "";
  const match = /^\$?(\d{1,6})(?:\.(\d{1,4}))?$/.exec(raw);
  if (!match) return { ok: false, error: "Enter the price in dollars, for example 4.50." };
  const fraction = match[2] ?? "";
  if (/[1-9]/.test(fraction.slice(2))) return { ok: false, error: "Price must be a whole number of cents." };
  const cents = Number(match[1]) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
  if (cents <= 0) return { ok: false, error: "Price must be greater than $0." };
  if (cents > ADMIN_MAX_PRICE_CENTS) {
    return { ok: false, error: `Price must be at most $${(ADMIN_MAX_PRICE_CENTS / 100).toFixed(2)}. Check the decimal point.` };
  }
  return { ok: true, cents };
}

export const formatCents = (cents: number | null | undefined) =>
  typeof cents === "number" && Number.isFinite(cents) ? `$${(cents / 100).toFixed(2)}` : "—";

// ---- Datasets (read-only reference data shipped with the app) ----

interface DatasetEntry {
  productId: string;
  slug: string;
  suggestedPriceCents: number | null;
  needsReview: boolean;
  reviewReasons: string[];
}
interface RefRow {
  id: string;
  productId: string;
  retailer: string;
  productMatch: string;
  packSize: string;
  price: number | null;
  sourceUrl: string | null;
  observedAt: string | null;
  confidence: string;
  kind: "OBSERVED" | "ESTIMATE";
}

const datasetBySlug = new Map((pricingDataset as DatasetEntry[]).map((e) => [e.slug, e]));
const datasetById = new Map((pricingDataset as DatasetEntry[]).map((e) => [e.productId, e]));

export function datasetEntryFor(product: { id: string; slug: string }): DatasetEntry | undefined {
  return datasetById.get(product.id) ?? datasetBySlug.get(product.slug);
}

/** Suggested price: the DB column first, else the committed dataset suggestion. Never a market price. */
export function effectiveSuggestedCents(product: { id: string; slug: string; suggestedPriceCents: number | null }): number | null {
  return product.suggestedPriceCents ?? datasetEntryFor(product)?.suggestedPriceCents ?? null;
}

export function reviewFlags(product: { id: string; slug: string }): { needsReview: boolean; reasons: string[] } {
  const entry = datasetEntryFor(product);
  return { needsReview: entry?.needsReview === true, reasons: entry?.reviewReasons ?? [] };
}

export interface MarketRef {
  id: string;
  kind: "OBSERVED" | "ESTIMATE";
  retailer: string;
  packSize: string | null;
  priceCents: number | null;
  sourceUrl: string | null;
  observedAt: string | null;
}

interface DbRef {
  id: string;
  competitor: string;
  packSize: string | null;
  observedPrice: number;
  sourceUrl: string | null;
  observedAt: Date | string | null;
}

const toCents = (dollars: number | null) => (dollars === null || !Number.isFinite(dollars) ? null : Math.round(dollars * 100));
const dateText = (d: Date | string | null) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);

/**
 * Merge shipped reference data with DB rows. OBSERVED means a dated, sourced observation; everything
 * else is an ESTIMATE. The DB table has no kind column, so a row without sourceUrl is treated as ESTIMATE.
 */
export function marketRefsFor(product: { id: string; slug: string }, dbRows: readonly DbRef[] = []): MarketRef[] {
  const files = [...(marketReferences as RefRow[]), ...(marketObservations as RefRow[])]
    .filter((r) => r.productId === product.id || r.productId === `staged-${product.slug}`)
    .map<MarketRef>((r) => ({
      id: r.id,
      kind: r.kind === "OBSERVED" && r.sourceUrl && r.observedAt ? "OBSERVED" : "ESTIMATE",
      retailer: r.retailer,
      packSize: r.packSize,
      priceCents: toCents(r.price),
      sourceUrl: r.sourceUrl,
      observedAt: r.observedAt
    }));
  const fromDb = dbRows.map<MarketRef>((r) => ({
    id: r.id,
    kind: r.sourceUrl ? "OBSERVED" : "ESTIMATE",
    retailer: r.competitor,
    packSize: r.packSize,
    priceCents: toCents(r.observedPrice),
    sourceUrl: r.sourceUrl,
    observedAt: dateText(r.observedAt)
  }));
  return [...files, ...fromDb];
}

export const countRefs = (refs: readonly MarketRef[]) => ({
  observed: refs.filter((r) => r.kind === "OBSERVED").length,
  estimate: refs.filter((r) => r.kind === "ESTIMATE").length
});

// ---- Commerce state and purchasability ----


export interface CommerceFields {
  approvalStatus: string;
  priceApprovedBy: string | null;
  priceCents: number | null;
  suggestedPriceCents: number | null;
  stockVerified: boolean;
  stockQuantity: number | null;
}

const hasApprovedPrice = (p: CommerceFields) =>
  p.approvalStatus === "APPROVED" && Boolean(p.priceApprovedBy?.trim()) && (p.priceCents ?? 0) > 0;

/**
 * Four-state badge.
 * VERIFIED: admin-approved price and human-verified stock count.
 * SUGGESTED: a suggested price exists but no admin has approved a price.
 * PENDING_APPROVAL: an unapproved price figure exists without a suggestion (legacy or imported), awaiting review.
 * MISSING_CONFIGURATION: no price at all, or an approved price whose stock is not verified.
 */
export function commerceState(p: CommerceFields): CommerceState {
  if (hasApprovedPrice(p)) return p.stockVerified && p.stockQuantity !== null ? "VERIFIED" : "MISSING_CONFIGURATION";
  if ((p.suggestedPriceCents ?? 0) > 0) return "SUGGESTED";
  if ((p.priceCents ?? 0) > 0) return "PENDING_APPROVAL";
  return "MISSING_CONFIGURATION";
}


const REASON_TEXT: Record<PurchasabilityReason, string> = {
  NOT_PUBLISHED: "Product is not published.",
  NOT_ACTIVE: "Product is not active.",
  NOT_PURCHASABLE: "Purchasable flag is off.",
  NOT_APPROVED: "Price is not approved.",
  PRICE_NOT_APPROVED: "No named admin has approved the price.",
  PRICE_INVALID: "Approved price is missing or not a positive amount.",
  STOCK_UNVERIFIED: "Stock count has not been verified.",
  STOCK_UNKNOWN: "Stock quantity is not set.",
  OUT_OF_STOCK: "No unreserved stock available.",
  INSUFFICIENT_STOCK: "Insufficient stock."
};
const BLOCKING_AVAILABILITY = new Set(["OUT_OF_STOCK", "DISCONTINUED", "ENQUIRY_ONLY"]);

/** Why a product cannot be switched to purchasable (empty = eligible). Uses the single shared storefront rule. */
export function purchasableBlockers(p: Omit<PurchasabilityFields, "isPurchasable">): string[] {
  const reasons: string[] = [];
  const reason = getPurchasabilityReason({ ...p, isPurchasable: true }, 1);
  if (reason) reasons.push(REASON_TEXT[reason]);
  if (p.availabilityStatus && BLOCKING_AVAILABILITY.has(p.availabilityStatus)) {
    reasons.push(`Availability status is ${p.availabilityStatus}.`);
  }
  return reasons;
}

// ---- CSV export ----

/** Neutralise spreadsheet formula injection and quote a CSV cell. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvRow = (cells: readonly unknown[]) => cells.map(csvCell).join(",");

export const PRICING_CSV_HEADERS = [
  "Product ID", "Slug", "Product Name", "Category", "Unit",
  "Suggested Price AUD", "Approved Price AUD", "Approval Status", "Approved By", "Approved At",
  "Tax Category", "Commerce State", "Stock Status", "Availability Status", "Is Purchasable",
  "Observed References", "Estimated References"
] as const;

export interface ExportProduct extends CommerceFields {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  taxCategory: string;
  availabilityStatus: string;
  isPurchasable: boolean;
  priceApprovedAt: Date | null;
  category: { name: string };
}

export const stockStatus = (p: Pick<CommerceFields, "stockQuantity" | "stockVerified">) =>
  p.stockQuantity === null ? "unknown" : p.stockVerified ? "verified" : "unverified";

const dollars = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2));

/** One CSV row per product. Cost price and competitor prices are deliberately never exported. */
export function pricingExportRow(p: ExportProduct, refs: readonly MarketRef[]): string {
  const counts = countRefs(refs);
  return csvRow([
    p.id, p.slug, p.name, p.category.name, p.unit ?? "",
    dollars(effectiveSuggestedCents(p)), hasApprovedPrice(p) ? dollars(p.priceCents) : "", p.approvalStatus,
    p.priceApprovedBy ?? "", p.priceApprovedAt?.toISOString() ?? "",
    p.taxCategory === "TAXABLE_10" ? "GST 10%" : "GST free", COMMERCE_STATE_LABEL[commerceState(p)],
    stockStatus(p), p.availabilityStatus, p.isPurchasable ? "yes" : "no",
    counts.observed, counts.estimate
  ]);
}
