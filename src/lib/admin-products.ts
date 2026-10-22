import type { Product } from "@prisma/client";
import { db } from "./db";
import { AdminHttpError, recordAudit } from "./admin-audit";
import { purchasableBlockers } from "./admin-pricing";

export const AVAILABILITY_STATUSES = ["IN_STOCK", "BACKORDER", "OUT_OF_STOCK", "UNKNOWN", "ENQUIRY_ONLY", "DISCONTINUED"] as const;
export const COMMERCE_FIELDS = ["stockQuantity", "stockVerified", "maxOrderQuantity", "availabilityStatus", "isPurchasable", "compareAtApproved"] as const;
const MAX_STOCK = 1_000_000;
const MAX_ORDER_QTY = 1000;

type CommerceKey = (typeof COMMERCE_FIELDS)[number];
type CommerceState = Pick<Product, CommerceKey>;

const commerceView = (p: Product): CommerceState => ({
  stockQuantity: p.stockQuantity, stockVerified: p.stockVerified, maxOrderQuantity: p.maxOrderQuantity,
  availabilityStatus: p.availabilityStatus, isPurchasable: p.isPurchasable, compareAtApproved: p.compareAtApproved
});

const isIntIn = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

function parsePatch(input: Record<string, unknown>): Partial<CommerceState> {
  const unknown = Object.keys(input).filter((k) => !(COMMERCE_FIELDS as readonly string[]).includes(k));
  if (unknown.length) throw new AdminHttpError(422, `Unsupported fields: ${unknown.join(", ")}.`, { fields: unknown });
  const errors: Record<string, string> = {};
  const patch: Partial<CommerceState> = {};
  if ("stockQuantity" in input) {
    if (input.stockQuantity === null || isIntIn(input.stockQuantity, 0, MAX_STOCK)) patch.stockQuantity = input.stockQuantity;
    else errors.stockQuantity = `Stock must be a whole number from 0 to ${MAX_STOCK}, or empty for unknown.`;
  }
  if ("maxOrderQuantity" in input) {
    if (input.maxOrderQuantity === null || isIntIn(input.maxOrderQuantity, 1, MAX_ORDER_QTY)) patch.maxOrderQuantity = input.maxOrderQuantity;
    else errors.maxOrderQuantity = `Maximum order quantity must be a whole number from 1 to ${MAX_ORDER_QTY}, or empty.`;
  }
  if ("availabilityStatus" in input) {
    if ((AVAILABILITY_STATUSES as readonly unknown[]).includes(input.availabilityStatus)) patch.availabilityStatus = input.availabilityStatus as string;
    else errors.availabilityStatus = `Availability must be one of ${AVAILABILITY_STATUSES.join(", ")}.`;
  }
  for (const key of ["stockVerified", "isPurchasable", "compareAtApproved"] as const) {
    if (!(key in input)) continue;
    if (typeof input[key] === "boolean") patch[key] = input[key];
    else errors[key] = `${key} must be true or false.`;
  }
  if (Object.keys(errors).length) throw new AdminHttpError(422, "Please fix the highlighted fields.", { fields: errors });
  return patch;
}

function resolveNext(before: Product, patch: Partial<CommerceState>): CommerceState {
  const next = { ...commerceView(before), ...patch };
  const quantityChanged = "stockQuantity" in patch && patch.stockQuantity !== before.stockQuantity;
  // A changed count is never trusted automatically: verification must be restated explicitly.
  if (quantityChanged && !("stockVerified" in patch)) next.stockVerified = false;
  if (next.stockQuantity === null && "stockVerified" in patch && patch.stockVerified === true) {
    throw new AdminHttpError(422, "Enter a stock quantity before marking it verified.", { fields: { stockVerified: "Needs a stock quantity." } });
  }
  if (next.stockQuantity === null) next.stockVerified = false;
  if (next.stockQuantity !== null && next.stockQuantity < before.reservedQuantity) {
    throw new AdminHttpError(422, `Stock cannot be below the ${before.reservedQuantity} units currently reserved.`, { fields: { stockQuantity: "Below reserved quantity." } });
  }
  return next;
}

function checkCompareAt(before: Product, next: CommerceState) {
  if (!next.compareAtApproved || before.compareAtApproved) return;
  const compare = before.compareAtPriceCents ?? (before.compareAtPrice === null ? null : Math.round(before.compareAtPrice * 100));
  if (compare === null || before.priceCents === null || compare <= before.priceCents) {
    throw new AdminHttpError(422, "A compare-at price can only be approved when it is set and higher than the approved price.", { fields: { compareAtApproved: "No valid compare-at price." } });
  }
}

function applyPurchasable(before: Product, patch: Partial<CommerceState>, next: CommerceState): string[] {
  const blockers = purchasableBlockers({ ...before, ...next });
  if (next.isPurchasable && blockers.length) {
    if (patch.isPurchasable === true) {
      throw new AdminHttpError(422, "This product cannot be made purchasable yet.", { reasons: blockers });
    }
    next.isPurchasable = false; // an edit made a purchasable product ineligible: fail closed
    return blockers;
  }
  return [];
}

/** Update stock/availability/purchasable flags with before/after audit in one transaction. */
export function updateProductCommerce(id: string, input: Record<string, unknown>, admin: string) {
  const patch = parsePatch(input);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`;
    const before = await tx.product.findUnique({ where: { id } });
    if (!before) throw new AdminHttpError(404, "Product not found.");
    const next = resolveNext(before, patch);
    checkCompareAt(before, next);
    const autoDisabled = applyPurchasable(before, patch, next);
    const claimed = await tx.product.updateMany({ where: { id, updatedAt: before.updatedAt }, data: next });
    if (claimed.count !== 1) throw new AdminHttpError(409, "This product changed while you were editing. Reload and try again.");
    await recordAudit(tx, {
      action: "PRODUCT_COMMERCE_UPDATED", entityType: "Product", entityId: id, admin,
      before: commerceView(before), after: { ...next, ...(autoDisabled.length ? { autoDisabledBecause: autoDisabled } : {}) },
      details: `Updated stock/availability settings for ${before.name}`
    });
    return { product: await tx.product.findUniqueOrThrow({ where: { id } }), autoDisabled };
  });
}
