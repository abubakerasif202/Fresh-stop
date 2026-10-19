import prices from "@/data/indicative-prices.json";

/** Presentation only. This flag never enables server checkout or approves inventory/prices. */
export const STOREFRONT_DEMO = process.env.NEXT_PUBLIC_STOREFRONT_DEMO === "true";
export function indicativePrice(slug: string, draft?: { indicativePriceCents?: number | null; indicativeUnit?: string | null; packageQuantity?: number }): { priceCents: number; unit: string; packageQuantity: number } | null {
  if (!STOREFRONT_DEMO) return null;
  const row = (prices as Record<string, { priceCents: number; unit: string; packageQuantity: number }>)[slug];
  if (Number.isInteger(draft?.indicativePriceCents) && (draft?.indicativePriceCents ?? 0) > 0 && (draft?.indicativePriceCents ?? 0) <= 1_000_000 && draft?.indicativeUnit) {
    return { priceCents: draft.indicativePriceCents as number, unit: draft.indicativeUnit, packageQuantity: typeof draft.packageQuantity === "number" && draft.packageQuantity > 0 ? draft.packageQuantity : row?.packageQuantity ?? 1 };
  }
  return row && Number.isInteger(row.priceCents) && row.priceCents > 0 ? row : null;
}
