import type { RefreshResult } from "./cart-core";

/** Validates the /api/cart/refresh response; anything malformed is treated as a failed refresh (returns null). */
export function parseRefreshResponse(body: unknown): RefreshResult[] | null {
  if (!body || typeof body !== "object") return null;
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  const out: RefreshResult[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== "object") return null;
    const r = entry as Record<string, unknown>;
    if (typeof r.productId !== "string" || typeof r.purchasable !== "boolean") return null;
    const cents = r.priceCents;
    if (cents !== null && !(typeof cents === "number" && Number.isInteger(cents) && cents > 0)) return null;
    out.push({
      productId: r.productId,
      purchasable: r.purchasable,
      priceCents: cents as number | null,
      reason: typeof r.reason === "string" ? r.reason : null
    });
  }
  return out;
}
