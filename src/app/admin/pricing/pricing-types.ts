export interface MarketRefView {
  id: string;
  kind: "OBSERVED" | "ESTIMATE";
  retailer: string;
  packSize: string | null;
  priceCents: number | null;
  sourceUrl: string | null;
  observedAt: string | null;
}

export interface PricingProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  unit: string | null;
  category: { id: string; name: string; slug: string };
  suggestedPriceCents: number | null;
  approvedPriceCents: number | null;
  approvalStatus: string;
  priceApprovedBy: string | null;
  priceApprovedAt: string | null;
  taxCategory: string;
  taxCategoryApprovedBy: string | null;
  taxCategoryApprovedAt: string | null;
  isPurchasable: boolean;
  stockStatus: string;
  commerceState: "VERIFIED" | "SUGGESTED" | "PENDING_APPROVAL" | "MISSING_CONFIGURATION";
  review: { needsReview: boolean; reasons: string[] };
  refCounts: { observed: number; estimate: number };
  refs: MarketRefView[];
}
