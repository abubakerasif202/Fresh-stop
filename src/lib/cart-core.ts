/**
 * Pure cart logic. The cart is a convenience list: it stores identifiers, a quantity and a display snapshot only.
 * The snapshot price is NEVER authoritative; the server re-prices every line at checkout.
 */

export const MAX_LINE_QUANTITY = 99;
export const MAX_CART_LINES = 50;
export const FALLBACK_IMAGE = "/products/placeholder-produce.webp";

export interface CartLine {
  productId: string;
  slug: string;
  quantity: number;
  /** Display snapshot below: name, unit, image and the price shown when the item was added. */
  name: string;
  unit: string;
  imageUrl: string;
  imageAlt: string | null;
  priceCents: number;
}

export type CartLineInput = Omit<CartLine, "quantity">;

/** Result of asking the server about one cart line (see /api/cart/refresh). */
export interface RefreshResult {
  productId: string;
  purchasable: boolean;
  priceCents: number | null;
  reason: string | null;
}

export type LineStatus =
  | { kind: "price-changed"; fromCents: number; toCents: number }
  | { kind: "unavailable"; reason: string };

export type LineStatusMap = Readonly<Record<string, LineStatus>>;

export function clampQuantity(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.trunc(n)));
}

const SAFE_IMAGE = /^\/[A-Za-z0-9._/-]{1,200}$/;

/** Cart data comes from localStorage, so only same-origin absolute paths are allowed as image sources. */
export function safeImageUrl(value: unknown): string {
  return typeof value === "string" && SAFE_IMAGE.test(value) && !value.includes("//") && !value.includes("..")
    ? value
    : FALLBACK_IMAGE;
}

const text = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : null;

/** Validates one untrusted stored/incoming line. Returns null when it cannot be trusted. */
export function sanitizeLine(raw: unknown): CartLine | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const productId = text(r.productId, 64);
  const slug = text(r.slug, 120);
  const name = text(r.name, 160);
  const cents = r.priceCents;
  if (!productId || !slug || !name) return null;
  if (typeof cents !== "number" || !Number.isInteger(cents) || cents <= 0 || cents > 100_000_00) return null;
  const quantity = r.quantity === undefined ? 1 : clampQuantity(r.quantity);
  return {
    productId,
    slug,
    name,
    quantity,
    unit: text(r.unit, 40) ?? "each",
    imageUrl: safeImageUrl(r.imageUrl),
    imageAlt: text(r.imageAlt, 160),
    priceCents: cents
  };
}

/** Sanitises a list, drops invalid lines and duplicate products, and caps the line count. */
export function sanitizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CartLine[] = [];
  for (const entry of raw) {
    const line = sanitizeLine(entry);
    if (!line || seen.has(line.productId)) continue;
    seen.add(line.productId);
    out.push(line);
    if (out.length >= MAX_CART_LINES) break;
  }
  return out;
}

export function addLine(lines: readonly CartLine[], input: CartLineInput, quantity = 1): CartLine[] {
  const incoming = sanitizeLine({ ...input, quantity });
  if (!incoming) return [...lines];
  const existing = lines.find((l) => l.productId === incoming.productId);
  if (existing) {
    return lines.map((l) =>
      l.productId === incoming.productId
        ? { ...l, ...incoming, quantity: clampQuantity(l.quantity + incoming.quantity) }
        : l
    );
  }
  if (lines.length >= MAX_CART_LINES) return [...lines];
  return [...lines, incoming];
}

/** A quantity below 1 removes the line. */
export function setLineQuantity(lines: readonly CartLine[], productId: string, quantity: number): CartLine[] {
  if (!Number.isFinite(quantity) || quantity < 1) return removeLine(lines, productId);
  return lines.map((l) => (l.productId === productId ? { ...l, quantity: clampQuantity(quantity) } : l));
}

export function removeLine(lines: readonly CartLine[], productId: string): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

export const clearLines = (): CartLine[] => [];

export function itemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

/** Estimated only: built from snapshot prices. The server total is the only authoritative amount. */
export function estimatedSubtotalCents(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export interface RefreshOutcome {
  lines: CartLine[];
  statuses: LineStatusMap;
}

/**
 * Merges server truth into the cart. Changed prices update the snapshot (and are flagged so the shopper is told);
 * unavailable or missing products stay in the cart but are flagged so they can be removed.
 */
export function applyRefresh(lines: readonly CartLine[], results: readonly RefreshResult[]): RefreshOutcome {
  const byId = new Map(results.map((r) => [r.productId, r]));
  const statuses: Record<string, LineStatus> = {};
  const next = lines.map((line) => {
    const result = byId.get(line.productId);
    if (!result || !result.purchasable || result.priceCents === null) {
      statuses[line.productId] = { kind: "unavailable", reason: result?.reason ?? "NOT_FOUND" };
      return line;
    }
    if (result.priceCents !== line.priceCents) {
      statuses[line.productId] = { kind: "price-changed", fromCents: line.priceCents, toCents: result.priceCents };
      return { ...line, priceCents: result.priceCents };
    }
    return line;
  });
  return { lines: next, statuses };
}

export function unavailableIds(statuses: LineStatusMap): string[] {
  return Object.entries(statuses).flatMap(([id, s]) => (s.kind === "unavailable" ? [id] : []));
}

export function removeLines(lines: readonly CartLine[], ids: readonly string[]): CartLine[] {
  const drop = new Set(ids);
  return lines.filter((l) => !drop.has(l.productId));
}

const REASON_COPY: Record<string, string> = {
  NOT_FOUND: "No longer listed",
  NOT_PUBLISHED: "No longer listed",
  NOT_ACTIVE: "No longer listed",
  OUT_OF_STOCK: "Out of stock",
  INSUFFICIENT_STOCK: "Not enough stock for this quantity"
};

export function reasonCopy(reason: string): string {
  return REASON_COPY[reason] ?? "Not available to order online right now";
}
