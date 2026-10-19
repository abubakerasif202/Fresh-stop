import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { AdminHttpError, recordAudit } from "./admin-audit";
import {
  ADMIN_MAX_PRICE_CENTS, MAX_BULK_APPROVE, MIN_OVERRIDE_REASON, bulkConfirmationPhrase, effectiveSuggestedCents,
  isValidUnit, parseDollarsToCents, reviewFlags
} from "./admin-pricing";

type Tx = Prisma.TransactionClient;
type ProductRow = NonNullable<Awaited<ReturnType<Tx["product"]["findUnique"]>>>;

export interface ApproveInput {
  productId: string;
  price: unknown;
  confirmedName: unknown;
  confirmedPriceCents: unknown;
  unit?: unknown;
  override?: { reason?: unknown } | null;
}

const priceSnapshot = (p: ProductRow) => ({
  priceCents: p.priceCents, unit: p.unit, approvalStatus: p.approvalStatus, priceApprovedBy: p.priceApprovedBy,
  priceApprovedAt: p.priceApprovedAt, priceSource: p.priceSource, isPurchasable: p.isPurchasable
});

async function loadProduct(tx: Tx, id: unknown): Promise<ProductRow> {
  if (typeof id !== "string" || !id || id.length > 64) throw new AdminHttpError(400, "Product ID is required.");
  const product = await tx.product.findUnique({ where: { id } });
  if (!product) throw new AdminHttpError(404, "Product not found.");
  return product;
}

function requireOverrideIfFlagged(product: ProductRow, override: ApproveInput["override"]): { reason: string } | null {
  const flags = reviewFlags(product);
  if (!flags.needsReview) return null;
  const reason = typeof override?.reason === "string" ? override.reason.trim() : "";
  if (reason.length < MIN_OVERRIDE_REASON) {
    throw new AdminHttpError(422, "This product is flagged for review. Tick the override box and give a reason to approve it.", {
      code: "NEEDS_REVIEW", reviewReasons: flags.reasons
    });
  }
  return { reason };
}

/** Apply an approved price to one product; writes history + audit in the caller's transaction. */
async function applyApproval(tx: Tx, before: ProductRow, cents: number, unit: string, admin: string, extra: Record<string, unknown>) {
  const now = new Date();
  const claimed = await tx.product.updateMany({
    where: { id: before.id, updatedAt: before.updatedAt },
    data: {
      priceCents: cents, price: cents / 100, unit, approvalStatus: "APPROVED", priceApprovedBy: admin,
      priceApprovedAt: now, priceUpdatedAt: now, priceSource: "ADMIN",
      ...(before.priceCents !== cents || before.unit !== unit ? { compareAtApproved: false } : {})
    }
  });
  if (claimed.count !== 1) throw new AdminHttpError(409, "This product changed while you were editing. Reload and try again.");
  await tx.productPriceHistory.create({
    data: { productId: before.id, oldPriceCents: before.priceCents, newPriceCents: cents, changedBy: admin, reason: "Admin approved selling price" }
  });
  const after = await tx.product.findUniqueOrThrow({ where: { id: before.id } });
  await recordAudit(tx, {
    action: "PRICE_APPROVED", entityType: "Product", entityId: before.id, admin,
    before: priceSnapshot(before), after: { ...priceSnapshot(after), ...extra },
    details: `Approved ${before.name} at $${(cents / 100).toFixed(2)} per ${unit}`
  });
  return after;
}

function resolveUnit(product: ProductRow, requested: unknown): string {
  const unit = requested === undefined || requested === "" ? product.unit : requested;
  if (!isValidUnit(unit)) throw new AdminHttpError(422, "Choose a valid selling unit before approving a price.", { field: "unit" });
  return unit.trim();
}

/** Approve a single typed price. Deliberate per-product action by the named admin. */
export function approveProductPrice(input: ApproveInput, admin: string) {
  return db.$transaction(async (tx) => {
    const product = await loadProduct(tx, input.productId);
    const parsed = parseDollarsToCents(input.price);
    if (!parsed.ok) throw new AdminHttpError(422, parsed.error, { field: "price" });
    if (input.confirmedName !== product.name || input.confirmedPriceCents !== parsed.cents) {
      throw new AdminHttpError(422, "Confirmation does not match the product name and price shown.", { code: "CONFIRMATION_MISMATCH" });
    }
    const override = requireOverrideIfFlagged(product, input.override);
    const unit = resolveUnit(product, input.unit);
    return applyApproval(tx, product, parsed.cents, unit, admin, override ? { reviewOverride: override.reason } : {});
  });
}

export interface BulkItem { productId: string; priceCents: number }

function validateBulk(items: unknown, confirmation: unknown): BulkItem[] {
  if (!Array.isArray(items) || items.length < 1) throw new AdminHttpError(422, "Select at least one product.");
  if (items.length > MAX_BULK_APPROVE) {
    throw new AdminHttpError(422, `Bulk approval is limited to ${MAX_BULK_APPROVE} products at a time.`, { code: "BULK_LIMIT" });
  }
  if (confirmation !== bulkConfirmationPhrase(items.length)) {
    throw new AdminHttpError(422, `Type "${bulkConfirmationPhrase(items.length)}" to confirm.`, { code: "CONFIRMATION_REQUIRED" });
  }
  const parsed = items.map((i) => ({ productId: (i as BulkItem)?.productId, priceCents: (i as BulkItem)?.priceCents }));
  if (parsed.some((i) => typeof i.productId !== "string" || !Number.isInteger(i.priceCents))) {
    throw new AdminHttpError(422, "Each selected item needs a product ID and an integer price in cents.");
  }
  if (new Set(parsed.map((i) => i.productId)).size !== parsed.length) throw new AdminHttpError(422, "Duplicate products selected.");
  return parsed;
}

/** Approve up to 10 products at exactly their suggested price. All-or-nothing; never touches isPurchasable. */
export function approveSelectedAtSuggested(items: unknown, confirmation: unknown, admin: string) {
  const batch = validateBulk(items, confirmation);
  return db.$transaction(async (tx) => {
    const results: { productId: string; priceCents: number }[] = [];
    const problems: { productId: string; reason: string }[] = [];
    const rows: { product: ProductRow; cents: number }[] = [];
    for (const item of batch) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      const suggested = product ? effectiveSuggestedCents(product) : null;
      if (!product) problems.push({ productId: item.productId, reason: "Product not found." });
      else if (suggested === null) problems.push({ productId: item.productId, reason: "No suggested price." });
      else if (!Number.isInteger(suggested) || suggested <= 0 || suggested > ADMIN_MAX_PRICE_CENTS) problems.push({ productId: item.productId, reason: "Suggested price is outside the allowed range." });
      else if (suggested !== item.priceCents) problems.push({ productId: item.productId, reason: "Price differs from the suggested price." });
      else if (reviewFlags(product).needsReview) problems.push({ productId: item.productId, reason: "Flagged for review: approve individually with an override." });
      else if (!isValidUnit(product.unit)) problems.push({ productId: item.productId, reason: "No selling unit set." });
      else rows.push({ product, cents: suggested });
    }
    if (problems.length) throw new AdminHttpError(422, "Some selected products cannot be approved in bulk.", { problems });
    for (const { product, cents } of rows) {
      await applyApproval(tx, product, cents, product.unit as string, admin, { bulk: true });
      results.push({ productId: product.id, priceCents: cents });
    }
    await recordAudit(tx, {
      action: "BULK_PRICE_APPROVED", entityType: "Product", admin, after: { count: results.length, items: results },
      details: `Approved ${results.length} products at suggested price`
    });
    return results;
  });
}

/** Withdraw an approval. Also forces the product non-purchasable. */
export function revokeProductApproval(productId: unknown, reason: unknown, admin: string) {
  return db.$transaction(async (tx) => {
    const before = await loadProduct(tx, productId);
    const note = typeof reason === "string" ? reason.trim() : "";
    if (note.length < MIN_OVERRIDE_REASON) throw new AdminHttpError(422, "Give a reason of at least 10 characters.", { field: "reason" });
    const claimed = await tx.product.updateMany({
      where: { id: before.id, updatedAt: before.updatedAt },
      data: { approvalStatus: "PENDING", priceApprovedBy: null, priceApprovedAt: null, priceSource: null, isPurchasable: false }
    });
    if (claimed.count !== 1) throw new AdminHttpError(409, "This product changed while you were editing. Reload and try again.");
    const after = await tx.product.findUniqueOrThrow({ where: { id: before.id } });
    await recordAudit(tx, {
      action: "PRICE_APPROVAL_REVOKED", entityType: "Product", entityId: before.id, admin,
      before: priceSnapshot(before), after: { ...priceSnapshot(after), reason: note }, details: `Revoked price approval for ${before.name}`
    });
    return after;
  });
}
