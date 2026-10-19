import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { hashOrderAccessToken, verifyOrderAccessToken } from "./order-access";
import { verifyOrderTrackingToken } from "./order-tracking";

const ORDER_REF_PATTERN = /^[A-Z0-9-]{4,40}$/;
/** Compared against when no order matches so "not found" and "wrong token" cost the same. */
const DUMMY_HASH = hashOrderAccessToken("order-lookup-dummy-token");

const accessibleOrderArgs = {
  include: { orderItems: true, storeBranch: true }
} satisfies Prisma.OrderDefaultArgs;

export type AccessibleOrder = Prisma.OrderGetPayload<typeof accessibleOrderArgs>;

export function normalizeOrderRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return ORDER_REF_PATTERN.test(normalized) ? normalized : null;
}

/** The order only when orderRef AND token match; null otherwise (identical for unknown order and wrong token). */
export async function findAccessibleOrder(orderRef: string, token: unknown): Promise<AccessibleOrder | null> {
  const order = await db.order.findFirst({
    where: { OR: [{ orderNumber: orderRef.toUpperCase() }, { id: orderRef }] },
    ...accessibleOrderArgs
  });
  const valid = verifyOrderAccessToken(token, order?.accessTokenHash ?? DUMMY_HASH);
  return order && (valid || verifyOrderTrackingToken(token, order)) ? order : null;
}

export type PaymentState = "PENDING" | "CONFIRMED" | "FAILED" | "EXPIRED" | "REFUNDED" | "PARTIALLY_REFUNDED";

/** Customer-facing payment state derived from the DB status only (never from a redirect). */
export function paymentStateOf(paymentStatus: string): PaymentState {
  switch (paymentStatus) {
    case "PAID":
      return "CONFIRMED";
    case "FAILED":
    case "EXPIRED":
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return paymentStatus;
    default:
      return "PENDING";
  }
}

export interface PublicOrderItem {
  name: string;
  unit: string;
  quantity: number;
  totalCents: number;
}

export interface PublicOrderView {
  orderNumber: string;
  orderStatus: string;
  paymentState: PaymentState;
  fulfillmentType: string;
  deliverySuburb: string | null;
  createdAt: string;
  items: PublicOrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  gstCents: number;
  totalCents: number;
  currency: string;
}

const toCents = (dollars: number): number => Math.round(dollars * 100);

/** Minimal projection: no phone, email, street address, notes, ids or Stripe references. */
export function toPublicOrderView(order: AccessibleOrder): PublicOrderView {
  return {
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentState: paymentStateOf(order.paymentStatus),
    fulfillmentType: order.fulfillmentType,
    deliverySuburb: order.fulfillmentType === "DELIVERY" ? order.deliverySuburb : null,
    createdAt: order.createdAt.toISOString(),
    items: order.orderItems.map((i) => ({ name: i.name, unit: i.unit, quantity: i.quantity, totalCents: i.totalCents })),
    subtotalCents: toCents(order.subtotal),
    deliveryFeeCents: toCents(order.deliveryFee),
    gstCents: toCents(order.gstTotal),
    totalCents: order.totalCents || toCents(order.total),
    currency: order.currency
  };
}
