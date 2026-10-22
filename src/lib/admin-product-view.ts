import type { Prisma } from "@prisma/client";
import { commerceState, purchasableBlockers } from "./admin-pricing";

/** Explicit select: costPrice and legacy market fields are never sent to the browser. */
export const PRODUCT_SELECT = {
  id: true, name: true, slug: true, description: true, unit: true, imageUrl: true, imageAlt: true,
  isPublished: true, isActive: true, taxCategory: true, taxCategoryApprovedBy: true, taxCategoryApprovedAt: true, categoryId: true,
  priceCents: true, suggestedPriceCents: true, approvalStatus: true, priceApprovedBy: true, priceApprovedAt: true,
  compareAtPrice: true, compareAtPriceCents: true, compareAtApproved: true,
  stockQuantity: true, stockVerified: true, reservedQuantity: true, maxOrderQuantity: true,
  availabilityStatus: true, isPurchasable: true,
  category: { select: { id: true, name: true, slug: true } },
  inventory: { select: { storeBranchId: true, isAvailable: true, storeBranch: { select: { slug: true } } } }
} as const;

export type ListedProduct = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;

export const withCommerceState = (p: ListedProduct) => ({
  ...p,
  commerceState: commerceState(p),
  purchasableBlockers: purchasableBlockers(p)
});
