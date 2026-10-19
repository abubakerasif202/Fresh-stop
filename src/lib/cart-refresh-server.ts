import { getPurchasabilityReason, type PurchasabilityFields } from "./purchasability";

export interface RefreshRequestItem {
  productId: string;
  quantity: number;
}

export interface RefreshProductRow extends PurchasabilityFields {
  id: string;
}

export interface RefreshResultRow {
  productId: string;
  purchasable: boolean;
  priceCents: number | null;
  reason: string | null;
}

export const MAX_REFRESH_ITEMS = 50;
const MAX_QTY = 99;

/** Validates the untrusted request body. Returns null when the shape is wrong. */
export function parseRefreshRequest(body: unknown): RefreshRequestItem[] | null {
  const items = body && typeof body === "object" ? (body as { items?: unknown }).items : null;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_REFRESH_ITEMS) return null;
  const seen = new Set<string>();
  const out: RefreshRequestItem[] = [];
  for (const entry of items) {
    const r = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : null;
    const id = r?.productId;
    const qty = r?.quantity === undefined ? 1 : r.quantity;
    if (typeof id !== "string" || id.length < 1 || id.length > 64) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ productId: id, quantity: qty });
  }
  return out;
}

/**
 * Read-only: the price is revealed only for products that are purchasable in the requested quantity. Unknown ids
 * are reported as NOT_FOUND. Stock counts are never exposed, only a reason code.
 */
export function buildRefreshResults(requested: readonly RefreshRequestItem[], rows: readonly RefreshProductRow[]): RefreshResultRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return requested.map(({ productId, quantity }) => {
    const row = byId.get(productId);
    if (!row) return { productId, purchasable: false, priceCents: null, reason: "NOT_FOUND" };
    const reason = getPurchasabilityReason(row, quantity);
    return reason === null
      ? { productId, purchasable: true, priceCents: row.priceCents, reason: null }
      : { productId, purchasable: false, priceCents: null, reason };
  });
}
