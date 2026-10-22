import type { PrismaClient } from "@prisma/client";
import { db } from "./db";
import { checkDelivery, formatCents, getPickupMinOrderCents } from "./delivery";
import { getPurchasabilityReason, type PurchasabilityReason } from "./purchasability";

/**
 * Server-side order pricing. Database only, integer cents only, fail closed.
 * Client-supplied prices are never read. The totals returned here are the only
 * source of Stripe amounts.
 */

/**
 * Technical safety cap on a single line when a product has no maxOrderQuantity.
 * This is NOT business policy; it only bounds abuse and fat-finger quantities.
 */
export const DEFAULT_MAX_LINE_QUANTITY = 20;
/** Technical safety cap on distinct lines per order. */
export const MAX_CART_LINES = 50;

export type PricingClient = Pick<PrismaClient, "product" | "deliveryZone" | "deliverySetting">;

export interface ClientCartItemInput {
  productId?: string;
  slug?: string;
  quantity: number;
  /** Optional price the shopper saw; used ONLY to detect a stale price (409), never to price. */
  expectedPriceCents?: number;
}

export interface VerifiedOrderItem {
  productId: string;
  slug: string;
  name: string;
  unit: string;
  imageUrl: string;
  priceCents: number;
  quantity: number;
  totalCents: number;
  taxCategory: "GST_FREE" | "TAXABLE_10";
  taxCents: number;
}

export interface ValidatedOrderResult {
  ok: true;
  currency: "aud";
  items: VerifiedOrderItem[];
  subtotalCents: number;
  gstTotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  primaryBranchSlug: string | null;
  zoneName: string | null;
}

export type ConflictReason =
  | PurchasabilityReason
  | "NOT_FOUND"
  | "QUANTITY_EXCEEDS_LIMIT"
  | "TAX_CATEGORY_UNKNOWN"
  | "PRICE_CHANGED"
  | "DUPLICATE_PRODUCT";

export interface OrderConflict {
  productId: string;
  reason: ConflictReason;
  available?: number;
  maxQuantity?: number;
}

export type OrderErrorCode =
  | "VALIDATION"
  | "CONFLICT"
  | "DELIVERY_UNAVAILABLE"
  | "BELOW_MIN_ORDER"
  | "DB_UNAVAILABLE";

export interface ValidationErrorResult {
  ok: false;
  status: 400 | 409 | 503;
  code: OrderErrorCode;
  error: string;
  conflicts?: OrderConflict[];
}

type ProductRow = Awaited<ReturnType<typeof fetchProducts>>[number];

const fail = (status: ValidationErrorResult["status"], code: OrderErrorCode, error: string, conflicts?: OrderConflict[]): ValidationErrorResult =>
  ({ ok: false, status, code, error, ...(conflicts ? { conflicts } : {}) });

/** GST is 1/11th of a GST-inclusive amount, rounded half-up, in integer arithmetic. */
export function gstFromInclusiveCents(lineTotalCents: number): number {
  return Math.floor((2 * lineTotalCents + 11) / 22);
}

function parseLines(rawItems: unknown): { ok: true; lines: Array<{ key: string; quantity: number; expected?: number }> } | ValidationErrorResult {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return fail(400, "VALIDATION", "Your shopping basket is empty.");
  if (rawItems.length > MAX_CART_LINES) return fail(400, "VALIDATION", "Too many different items in one order.");
  const lines: Array<{ key: string; quantity: number; expected?: number }> = [];
  const seen = new Set<string>();
  for (const item of rawItems as ClientCartItemInput[]) {
    const key = String((item && (item.productId || item.slug)) ?? "").trim();
    if (!key) return fail(400, "VALIDATION", "Each item needs a product.");
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) return fail(400, "VALIDATION", `Invalid quantity for item ${key}.`);
    if (seen.has(key)) return fail(400, "VALIDATION", `Item ${key} appears more than once.`);
    seen.add(key);
    const expected = Number.isSafeInteger(item.expectedPriceCents) ? item.expectedPriceCents : undefined;
    lines.push({ key, quantity: item.quantity, expected });
  }
  return { ok: true, lines };
}

async function fetchProducts(client: PricingClient, keys: string[]) {
  return client.product.findMany({
    where: { OR: [{ id: { in: keys } }, { slug: { in: keys } }] },
    select: {
      id: true, slug: true, name: true, imageUrl: true, unit: true, priceCents: true, taxCategory: true, taxCategoryApprovedBy: true, taxCategoryApprovedAt: true,
      isPublished: true, isActive: true, isPurchasable: true, approvalStatus: true, priceApprovedBy: true,
      stockVerified: true, stockQuantity: true, reservedQuantity: true, availabilityStatus: true, maxOrderQuantity: true
    }
  });
}

function conflictFor(product: ProductRow, quantity: number, expected?: number): OrderConflict | null {
  const reason = getPurchasabilityReason(product, quantity);
  if (reason === "INSUFFICIENT_STOCK" || reason === "OUT_OF_STOCK") {
    return { productId: product.id, reason, available: Math.max(0, (product.stockQuantity ?? 0) - product.reservedQuantity) };
  }
  if (reason) return { productId: product.id, reason };
  const maxQuantity = product.maxOrderQuantity && product.maxOrderQuantity > 0 ? product.maxOrderQuantity : DEFAULT_MAX_LINE_QUANTITY;
  if (quantity > maxQuantity) return { productId: product.id, reason: "QUANTITY_EXCEEDS_LIMIT", maxQuantity };
  if (product.taxCategory !== "GST_FREE" && product.taxCategory !== "TAXABLE_10") return { productId: product.id, reason: "TAX_CATEGORY_UNKNOWN" };
  if (expected !== undefined && expected !== product.priceCents) return { productId: product.id, reason: "PRICE_CHANGED" };
  return null;
}

function priceLine(product: ProductRow, quantity: number): VerifiedOrderItem {
  const priceCents = product.priceCents as number;
  const totalCents = priceCents * quantity;
  const taxCategory = product.taxCategory as "GST_FREE" | "TAXABLE_10";
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    unit: product.unit || "each",
    imageUrl: product.imageUrl,
    priceCents,
    quantity,
    totalCents,
    taxCategory,
    taxCents: taxCategory === "TAXABLE_10" ? gstFromInclusiveCents(totalCents) : 0
  };
}

function resolveLines(lines: Array<{ key: string; quantity: number; expected?: number }>, products: ProductRow[]) {
  const items: VerifiedOrderItem[] = [];
  const conflicts: OrderConflict[] = [];
  const resolved = new Set<string>();
  for (const line of lines) {
    const product = products.find((p) => p.id === line.key || p.slug === line.key);
    if (!product) {
      conflicts.push({ productId: line.key, reason: "NOT_FOUND" });
      continue;
    }
    if (resolved.has(product.id)) {
      conflicts.push({ productId: product.id, reason: "DUPLICATE_PRODUCT" });
      continue;
    }
    resolved.add(product.id);
    const conflict = conflictFor(product, line.quantity, line.expected);
    if (conflict) conflicts.push(conflict);
    else items.push(priceLine(product, line.quantity));
  }
  return { items, conflicts };
}

async function priceFulfilment(
  client: PricingClient,
  subtotalCents: number,
  fulfillmentType: string,
  postcode: string | undefined
): Promise<{ deliveryFeeCents: number; zoneName: string | null; primaryBranchSlug: string | null } | ValidationErrorResult> {
  if (fulfillmentType === "PICKUP") {
    let minCents: number | null;
    try {
      minCents = await getPickupMinOrderCents(client);
    } catch {
      return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable. Please try again shortly.");
    }
    if (minCents !== null && subtotalCents < minCents) {
      return fail(400, "BELOW_MIN_ORDER", `The minimum order for pickup is ${formatCents(minCents)} AUD.`);
    }
    return { deliveryFeeCents: 0, zoneName: null, primaryBranchSlug: null };
  }
  if (fulfillmentType !== "DELIVERY") return fail(400, "VALIDATION", "Choose delivery or pickup.");
  if (!postcode) return fail(400, "VALIDATION", "A delivery postcode is required for delivery orders.");
  const delivery = await checkDelivery(postcode, subtotalCents, client);
  if (delivery.eligible) {
    return { deliveryFeeCents: delivery.deliveryFeeCents, zoneName: delivery.zoneName, primaryBranchSlug: delivery.primaryBranchSlug };
  }
  if (delivery.code === "DB_UNAVAILABLE") return fail(503, "DB_UNAVAILABLE", delivery.message);
  if (delivery.code === "BELOW_MIN_ORDER") return fail(400, "BELOW_MIN_ORDER", delivery.message);
  return fail(400, "DELIVERY_UNAVAILABLE", delivery.message);
}

export async function validateAndPriceOrder(
  rawItems: unknown,
  deliveryPostcode?: string,
  fulfillmentType = "DELIVERY",
  client: PricingClient = db
): Promise<ValidatedOrderResult | ValidationErrorResult> {
  const parsed = parseLines(rawItems);
  if (!parsed.ok) return parsed;

  let products: ProductRow[];
  try {
    products = await fetchProducts(client, parsed.lines.map((l) => l.key));
  } catch {
    return fail(503, "DB_UNAVAILABLE", "Checkout is temporarily unavailable. Please try again shortly.");
  }

  const { items, conflicts } = resolveLines(parsed.lines, products);
  if (conflicts.length > 0) {
    return fail(409, "CONFLICT", "Some items in your basket changed or are unavailable. Please review your basket.", conflicts);
  }

  const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const gstTotalCents = items.reduce((sum, item) => sum + item.taxCents, 0);
  const fulfilment = await priceFulfilment(client, subtotalCents, fulfillmentType, deliveryPostcode);
  if ("ok" in fulfilment) return fulfilment;

  return {
    ok: true,
    currency: "aud",
    items,
    subtotalCents,
    gstTotalCents,
    deliveryFeeCents: fulfilment.deliveryFeeCents,
    totalCents: subtotalCents + fulfilment.deliveryFeeCents,
    primaryBranchSlug: fulfilment.primaryBranchSlug,
    zoneName: fulfilment.zoneName
  };
}
