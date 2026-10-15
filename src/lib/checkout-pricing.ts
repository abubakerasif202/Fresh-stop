import { checkDeliveryEligibility, type DeliveryCheckResult } from "./delivery";

export const MAX_ITEM_QUANTITY = 99;
export const MAX_CART_LINES = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PricedProduct {
  id: string;
  name: string;
  price: number;
  unit: string;
  imageUrl: string;
  isSpecial: boolean;
  specialPrice: number | null;
}

export interface RequestedItem {
  id: string;
  quantity: number;
}

export interface VerifiedLine {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  imageUrl: string;
}

export type PricingResult =
  | { ok: true; lines: VerifiedLine[]; subtotal: number }
  | { ok: false; error: string };

const round2 = (n: number) => Number(n.toFixed(2));

export function unitPrice(p: Pick<PricedProduct, "price" | "isSpecial" | "specialPrice">): number {
  return p.isSpecial && p.specialPrice != null && p.specialPrice > 0 ? p.specialPrice : p.price;
}

const QTY_ERROR = `Quantity must be a whole number between 1 and ${MAX_ITEM_QUANTITY}.`;

/** Parse untrusted cart input into {id, quantity}, ignoring any client price/name. */
export function parseRequestedItems(
  raw: unknown
): { ok: true; items: RequestedItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Your shopping basket is empty." };
  }
  if (raw.length > MAX_CART_LINES) {
    return { ok: false, error: "Too many items in basket." };
  }
  const merged = new Map<string, number>();
  for (const it of raw) {
    const rec = it && typeof it === "object" ? (it as { id?: unknown; quantity?: unknown }) : {};
    if (typeof rec.id !== "string" || !rec.id || rec.id.length > 128) {
      return { ok: false, error: "Invalid item in cart." };
    }
    const qty = rec.quantity;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QUANTITY) {
      return { ok: false, error: QTY_ERROR };
    }
    const total = (merged.get(rec.id) ?? 0) + qty;
    if (total > MAX_ITEM_QUANTITY) {
      return { ok: false, error: QTY_ERROR };
    }
    merged.set(rec.id, total);
  }
  return { ok: true, items: [...merged].map(([id, quantity]) => ({ id, quantity })) };
}

/**
 * Price items from server-side records. `products` are the DB rows for the requested ids;
 * `availableIds` is the set of product ids available at the target branch.
 */
export function priceItems(
  items: RequestedItem[],
  products: PricedProduct[],
  availableIds: ReadonlySet<string>
): PricingResult {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: VerifiedLine[] = [];
  for (const { id, quantity } of items) {
    const p = byId.get(id);
    if (!p) return { ok: false, error: "An item in your basket is no longer available." };
    if (!availableIds.has(id)) {
      return { ok: false, error: `${p.name} is not available at this store branch.` };
    }
    const price = unitPrice(p);
    if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "An item price is currently unavailable. Please contact the store." };
    lines.push({ id: p.id, name: p.name, price, quantity, unit: p.unit, imageUrl: p.imageUrl });
  }
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  if (!Number.isFinite(subtotal) || subtotal <= 0) return { ok: false, error: "Order subtotal must be greater than zero." };
  return { ok: true, lines, subtotal };
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

export interface ContactFields {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryPostcode: string;
  deliveryNotes: string;
  pickupTimeslot: string;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalizeContact(body: Record<string, unknown>): ContactFields {
  return {
    customerName: str(body.customerName, 100),
    customerEmail: str(body.customerEmail, 254),
    customerPhone: str(body.customerPhone, 30),
    deliveryAddress: str(body.deliveryAddress, 200),
    deliveryPostcode: str(body.deliveryPostcode, 10),
    deliveryNotes: str(body.deliveryNotes, 500),
    pickupTimeslot: str(body.pickupTimeslot, 60)
  };
}

export type PaymentResult = { ok: true; method: "PAY_ON_PICKUP" } | { ok: false; error: string };

export function resolvePaymentMethod(raw: unknown): PaymentResult {
  if (raw === undefined || raw === null || raw === "" || raw === "PAY_ON_PICKUP") {
    return { ok: true, method: "PAY_ON_PICKUP" };
  }
  if (raw === "STRIPE") return { ok: false, error: "Card payments are not available online yet." };
  return { ok: false, error: "Unsupported payment method." };
}

export type DeliveryQuote =
  | { ok: true; deliveryFee: number; assignedBranch: DeliveryCheckResult["assignedBranch"] }
  | { ok: false; error: string };

export function quoteDelivery(postcode: string, subtotal: number): DeliveryQuote {
  const check = checkDeliveryEligibility(postcode, subtotal);
  if (!check.eligible || !check.meetsMinimumSpend) return { ok: false, error: check.message };
  return { ok: true, deliveryFee: check.deliveryFee, assignedBranch: check.assignedBranch };
}
