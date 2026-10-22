import { randomInt } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { CheckoutInput } from "./checkout-input";
import { RESERVATION_TTL_MINUTES } from "./checkout-stripe";
import { releaseReservation, reserveStock, StockConflictError } from "./inventory";
import { validateAndPriceOrder, type ValidatedOrderResult } from "./order-pricing";

/** Order persistence for checkout: one transaction for order + items + reservations. */

const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ORDER_NUMBER_SUFFIX_LENGTH = 6;
const ORDER_NUMBER_ATTEMPTS = 5;
const TX_OPTIONS = { maxWait: 5000, timeout: 15000 } as const;

export const centsToDollars = (cents: number): number => Number((cents / 100).toFixed(2));

/** FS-YYMMDD-XXXXXX with a crypto-random suffix (about 1e9 combinations per day). */
export function generateOrderNumber(now: Date = new Date()): string {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  let suffix = "";
  for (let i = 0; i < ORDER_NUMBER_SUFFIX_LENGTH; i += 1) {
    suffix += ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)];
  }
  return `FS-${date}-${suffix}`;
}

export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  if (!field) return true;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
}

export interface PersistedOrder {
  id: string;
  orderNumber: string;
}

async function createInTransaction(
  tx: Prisma.TransactionClient,
  input: CheckoutInput,
  priced: ValidatedOrderResult,
  accessTokenHash: string,
  now: Date
): Promise<PersistedOrder> {
  for (const item of [...priced.items].sort((a, b) => a.productId.localeCompare(b.productId))) {
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${item.productId} FOR UPDATE`;
    const current = await tx.product.findUnique({ where: { id: item.productId } });
    if (!current || current.priceCents !== item.priceCents || (current.unit || "each") !== item.unit || current.taxCategory !== item.taxCategory ||
      (current.maxOrderQuantity !== null && item.quantity > current.maxOrderQuantity)) {
      throw new StockConflictError([{ productId: item.productId, reason: "PRICE_CHANGED" }]);
    }
  }
  // Hold configuration rows through persistence so fees/approval cannot change after revalidation.
  await tx.$queryRaw`SELECT "id" FROM "DeliveryZone" ORDER BY "id" FOR SHARE`;
  await tx.$queryRaw`SELECT "key" FROM "DeliverySetting" ORDER BY "key" FOR SHARE`;
  const currentPricing = await validateAndPriceOrder(input.items, input.customer.postcode, input.fulfillmentType, tx);
  if (!currentPricing.ok || currentPricing.totalCents !== priced.totalCents || currentPricing.gstTotalCents !== priced.gstTotalCents || currentPricing.deliveryFeeCents !== priced.deliveryFeeCents ||
    currentPricing.primaryBranchSlug !== priced.primaryBranchSlug || currentPricing.zoneName !== priced.zoneName) {
    throw new StockConflictError(priced.items.map((item) => ({ productId: item.productId, reason: "PRICE_CHANGED" })));
  }
  const { customer } = input;
  const branchSlug = input.fulfillmentType === "DELIVERY" ? priced.primaryBranchSlug : input.pickupBranchSlug;
  if (branchSlug) await tx.$queryRaw`SELECT "id" FROM "StoreBranch" WHERE "slug" = ${branchSlug} FOR SHARE`;
  const branch = branchSlug ? await tx.storeBranch.findUnique({ where: { slug: branchSlug } }) : null;
  if (!branch || !branch.isActive) throw new StockConflictError(priced.items.map((item) => ({ productId: item.productId, reason: "INSUFFICIENT_STOCK" })));
  const customerRecord = await tx.customer.upsert({
    where: { email: customer.email },
    update: { name: customer.name, phone: customer.phone },
    create: { email: customer.email, name: customer.name, phone: customer.phone }
  });
  const order = await tx.order.create({
    data: {
      orderNumber: generateOrderNumber(now),
      fulfillmentType: input.fulfillmentType,
      storeBranchId: branch?.id ?? null,
      customerId: customerRecord.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      deliveryAddress: customer.address || null,
      deliverySuburb: customer.suburb || null,
      deliveryPostcode: customer.postcode || null,
      deliveryNotes: customer.notes || null,
      preferredDeliveryDate: customer.preferredDeliveryDate,
      itemsJson: JSON.stringify(priced.items),
      subtotal: centsToDollars(priced.subtotalCents),
      deliveryFee: centsToDollars(priced.deliveryFeeCents),
      gstTotal: centsToDollars(priced.gstTotalCents),
      total: centsToDollars(priced.totalCents),
      totalCents: priced.totalCents,
      currency: priced.currency,
      paymentMethod: "STRIPE",
      paymentStatus: "PENDING",
      orderStatus: "PENDING_PAYMENT",
      accessTokenHash,
      idempotencyKey: input.idempotencyKey,
      orderItems: {
        create: priced.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          slug: item.slug,
          quantity: item.quantity,
          unit: item.unit,
          priceCents: item.priceCents,
          totalCents: item.totalCents,
          taxCategory: item.taxCategory,
          taxCents: item.taxCents
        }))
      }
    },
    select: { id: true, orderNumber: true }
  });
  const lines = priced.items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
  await reserveStock(tx, order.id, lines, RESERVATION_TTL_MINUTES, now);
  return order;
}

/**
 * Creates the order, its items and the stock reservations atomically. A stock
 * conflict (StockConflictError) rolls everything back. An order-number
 * collision retries the whole transaction with a fresh number.
 */
export async function persistOrder(
  client: PrismaClient,
  input: CheckoutInput,
  priced: ValidatedOrderResult,
  accessTokenHash: string,
  now: Date
): Promise<PersistedOrder> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await client.$transaction((tx) => createInTransaction(tx, input, priced, accessTokenHash, now), TX_OPTIONS);
    } catch (error) {
      if (attempt < ORDER_NUMBER_ATTEMPTS && isUniqueViolation(error, "orderNumber")) continue;
      throw error;
    }
  }
}

/** Marks an unpaid order failed and returns its stock. Never throws. */
export async function abandonOrder(client: PrismaClient, orderId: string, now: Date): Promise<boolean> {
  try {
    await client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
      await releaseReservation(tx, orderId, "RELEASED");
      await tx.order.updateMany({
        where: { id: orderId, paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED", orderStatus: "CANCELLED", cancelledAt: now }
      });
    }, TX_OPTIONS);
    return true;
  } catch {
    return false;
  }
}

export type ExistingOrder = Prisma.OrderGetPayload<{ include: { orderItems: true; storeBranch: { select: { slug: true } } } }>;

export function findOrderByIdempotencyKey(client: PrismaClient, key: string): Promise<ExistingOrder | null> {
  return client.order.findUnique({ where: { idempotencyKey: key }, include: { orderItems: true, storeBranch: { select: { slug: true } } } });
}

/** True when a replayed request describes exactly the cart/fulfilment of the stored order. */
export function isSameCart(existing: ExistingOrder, input: CheckoutInput): boolean {
  if (existing.fulfillmentType !== input.fulfillmentType) return false;
  const customer = input.customer;
  if (existing.customerName !== customer.name || existing.customerEmail !== customer.email || existing.customerPhone !== customer.phone ||
    (existing.deliveryAddress ?? "") !== customer.address || (existing.deliverySuburb ?? "") !== customer.suburb ||
    (existing.deliveryPostcode ?? "") !== customer.postcode || (existing.deliveryNotes ?? "") !== customer.notes ||
    existing.preferredDeliveryDate !== customer.preferredDeliveryDate) return false;
  if (input.fulfillmentType === "PICKUP" && existing.storeBranch?.slug !== input.pickupBranchSlug) return false;
  if (input.fulfillmentType === "DELIVERY" && existing.deliveryPostcode !== input.customer.postcode) return false;
  if (existing.orderItems.length !== input.items.length) return false;
  return input.items.every((line) => {
    const key = line.productId ?? line.slug;
    return existing.orderItems.some((item) => (item.productId === key || item.slug === key) && item.quantity === line.quantity);
  });
}
