/**
 * Single server-side rule for whether a product may be sold online.
 * Stock-controlled products fail closed. Explicit BACKORDER products may be sourced after purchase.
 */

export interface PurchasabilityFields {
  isPublished: boolean;
  isActive: boolean;
  isPurchasable: boolean;
  approvalStatus: string;
  priceApprovedBy: string | null;
  priceCents: number | null;
  taxCategory: string;
  taxCategoryApprovedBy: string | null;
  taxCategoryApprovedAt: Date | null;
  stockVerified: boolean;
  stockQuantity: number | null;
  reservedQuantity: number;
  availabilityStatus?: string | null;
}

export type PurchasabilityReason =
  | "NOT_PUBLISHED"
  | "NOT_ACTIVE"
  | "NOT_PURCHASABLE"
  | "NOT_APPROVED"
  | "PRICE_NOT_APPROVED"
  | "PRICE_INVALID"
  | "TAX_NOT_APPROVED"
  | "STOCK_UNVERIFIED"
  | "STOCK_UNKNOWN"
  | "OUT_OF_STOCK"
  | "INSUFFICIENT_STOCK";

/** Returns null when the product can be sold in `quantity`, otherwise the first failing reason. */
export function getPurchasabilityReason(product: PurchasabilityFields, quantity = 1): PurchasabilityReason | null {
  if (!Number.isInteger(quantity) || quantity < 1) return "INSUFFICIENT_STOCK";
  if (!product.isPublished) return "NOT_PUBLISHED";
  if (!product.isActive) return "NOT_ACTIVE";
  if (!product.isPurchasable) return "NOT_PURCHASABLE";
  if (product.approvalStatus !== "APPROVED") return "NOT_APPROVED";
  if (!product.priceApprovedBy || product.priceApprovedBy.trim() === "") return "PRICE_NOT_APPROVED";
  if (!Number.isInteger(product.priceCents) || (product.priceCents ?? 0) <= 0) return "PRICE_INVALID";
  if ((product.taxCategory !== "GST_FREE" && product.taxCategory !== "TAXABLE_10") || !product.taxCategoryApprovedBy?.trim() || !product.taxCategoryApprovedAt) return "TAX_NOT_APPROVED";
  // BACKORDER is an explicit owner policy, not an assertion about physical inventory.
  if (product.availabilityStatus === "BACKORDER") return null;
  if (!product.stockVerified) return "STOCK_UNVERIFIED";
  if (product.stockQuantity === null || !Number.isInteger(product.stockQuantity)) return "STOCK_UNKNOWN";
  if (product.availabilityStatus === "OUT_OF_STOCK") return "OUT_OF_STOCK";
  const available = product.stockQuantity - Math.max(0, product.reservedQuantity);
  if (available < 1) return "OUT_OF_STOCK";
  if (available < quantity) return "INSUFFICIENT_STOCK";
  return null;
}

export function isProductPurchasable(product: PurchasabilityFields, quantity = 1): boolean {
  return getPurchasabilityReason(product, quantity) === null;
}
