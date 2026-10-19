/** No pricing decisions use client-submitted prices, names, tax codes or delivery fees. */
export interface CartItem { productId: string; quantity: number }
export interface CheckoutInput {
  items: CartItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryPostcode: string;
}

export function parseCheckoutInput(data: unknown): CheckoutInput {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid checkout input.");
  const body = data as Record<string, unknown>;
  const field = (key: string, max: number) => {
    const value = body[key];
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error("Invalid " + key + ".");
    return value.trim();
  };
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) throw new Error("Cart size is invalid.");
  const seen = new Set<string>();
  const items = body.items.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid cart item.");
    const row = item as Record<string, unknown>;
    if (typeof row.productId !== "string" || row.productId.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(row.productId) || seen.has(row.productId)) throw new Error("Invalid or duplicate product.");
    if (!Number.isSafeInteger(row.quantity) || (row.quantity as number) < 1 || (row.quantity as number) > 20) throw new Error("Invalid quantity.");
    seen.add(row.productId);
    return { productId: row.productId, quantity: row.quantity as number };
  });
  const customerEmail = field("customerEmail", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error("Invalid email.");
  const customerPhone = field("customerPhone", 30);
  if (!/^[+0-9()\s-]{7,30}$/.test(customerPhone)) throw new Error("Invalid phone.");
  const deliveryPostcode = field("deliveryPostcode", 4);
  if (!/^\d{4}$/.test(deliveryPostcode)) throw new Error("Invalid Australian postcode.");
  return { items, customerName: field("customerName", 120), customerEmail, customerPhone, deliveryAddress: field("deliveryAddress", 250), deliveryPostcode };
}

/** Reject fractional cents, zero, negative, NaN and absent prices. */
export function priceToCents(price: number | null | undefined): number | null {
  if (price == null || !Number.isFinite(price) || price <= 0 || price > 10000) return null;
  const cents = Math.round(price * 100);
  if (Math.abs(cents - price * 100) > 1e-6 || !Number.isSafeInteger(cents)) return null;
  return cents;
}

export function postcodeInZone(raw: string, postcode: string): boolean {
  return raw.split(/[\s,;|]+/).some(part => part === postcode);
}

export function calculateTotals(lines: { unitCents: number; quantity: number }[], deliveryFeeCents: number) {
  if (!lines.length || !Number.isSafeInteger(deliveryFeeCents) || deliveryFeeCents < 0) throw new Error("Invalid totals.");
  let subtotalCents = 0;
  for (const line of lines) {
    if (!Number.isSafeInteger(line.unitCents) || line.unitCents < 1 || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 20) throw new Error("Invalid line.");
    subtotalCents += line.unitCents * line.quantity;
  }
  if (subtotalCents + deliveryFeeCents > 10_000_000) throw new Error("Order exceeds checkout maximum.");
  return { subtotalCents, deliveryFeeCents, totalCents: subtotalCents + deliveryFeeCents };
}
