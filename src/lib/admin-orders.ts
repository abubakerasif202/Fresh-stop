import { db } from "./db";
import { AdminHttpError, recordAudit } from "./admin-audit";
import { releaseReservation } from "./inventory";
import { resendOrderEmails } from "./email";

export const FULFILMENT_STATUSES = ["RECEIVED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
export const ADMIN_ORDER_STATUSES = ["PENDING_PAYMENT", ...FULFILMENT_STATUSES, "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

type FulfilmentType = "DELIVERY" | "PICKUP" | string;

/** Allowed next statuses. READY leads to OUT_FOR_DELIVERY for deliveries and straight to DELIVERED (collected) for pickups. */
const NEXT: Record<string, readonly string[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: []
};

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function checkTransition(input: { from: string; to: string; paymentStatus: string; fulfillmentType: FulfilmentType }): TransitionCheck {
  const { from, to, paymentStatus, fulfillmentType } = input;
  if (!(ADMIN_ORDER_STATUSES as readonly string[]).includes(to) || to === "PENDING_PAYMENT") {
    return { ok: false, reason: `"${to}" is not a status an admin can set.` };
  }
  if (!(from in NEXT)) return { ok: false, reason: `Order is in an unrecognised status (${from}); only a developer can change it.` };
  if (!NEXT[from].includes(to)) return { ok: false, reason: `An order cannot move from ${from} to ${to}.` };
  if (to === "CANCELLED") return { ok: true };
  if (paymentStatus !== "PAID") return { ok: false, reason: "Only paid orders can move into fulfilment. Payment is confirmed by Stripe, not by hand." };
  if (from === "READY" && to === "OUT_FOR_DELIVERY" && fulfillmentType !== "DELIVERY") {
    return { ok: false, reason: "Pickup orders are not sent out for delivery." };
  }
  if (from === "READY" && to === "DELIVERED" && fulfillmentType !== "PICKUP") {
    return { ok: false, reason: "Delivery orders must go out for delivery before they are delivered." };
  }
  return { ok: true };
}

/** Next statuses valid for an order right now (drives the UI buttons). */
export function nextStatuses(order: { orderStatus: string; paymentStatus: string; fulfillmentType: FulfilmentType }): string[] {
  return (NEXT[order.orderStatus] ?? []).filter((to) => checkTransition({ from: order.orderStatus, to, paymentStatus: order.paymentStatus, fulfillmentType: order.fulfillmentType }).ok);
}

/** Last 4 characters only; Stripe identifiers are never shown in full in the admin UI. */
export const maskRef = (value: string | null | undefined) => (value ? `…${value.slice(-4)}` : null);

const orderView = (o: { orderStatus: string; paymentStatus: string; cancelledAt: Date | null }) => ({
  orderStatus: o.orderStatus, paymentStatus: o.paymentStatus, cancelledAt: o.cancelledAt
});

/** Reject any attempt to alter payment state by hand. */
export function assertNoPaymentFields(body: Record<string, unknown>) {
  for (const key of ["paymentStatus", "paid", "paidAt", "amountPaidCents", "refundedCents"]) {
    if (key in body) throw new AdminHttpError(422, "Payment status cannot be changed by hand. It is set only by verified Stripe events.", { code: "MANUAL_PAYMENT_REJECTED" });
  }
}

/** Move an order along the validated transition table. Cancelling an unpaid order releases its reservation. */
export function changeOrderStatus(orderId: string, to: string, admin: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const before = await tx.order.findUnique({ where: { id: orderId } });
    if (!before) throw new AdminHttpError(404, "Order not found.");
    const check = checkTransition({ from: before.orderStatus, to, paymentStatus: before.paymentStatus, fulfillmentType: before.fulfillmentType });
    if (!check.ok) throw new AdminHttpError(422, check.reason, { code: "INVALID_TRANSITION" });
    const unpaidCancel = to === "CANCELLED" && before.orderStatus === "PENDING_PAYMENT" && ["PENDING", "FAILED"].includes(before.paymentStatus);
    const claimed = await tx.order.updateMany({
      where: { id: orderId, orderStatus: before.orderStatus, paymentStatus: before.paymentStatus },
      data: {
        orderStatus: to,
        ...(to === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        // Mirrors the expiry sweeper so a cancelled unpaid order can never be treated as awaiting payment.
        ...(unpaidCancel ? { paymentStatus: "EXPIRED" } : {})
      }
    });
    if (claimed.count !== 1) throw new AdminHttpError(409, "This order changed while you were editing. Reload and try again.");
    if (unpaidCancel) await releaseReservation(tx, orderId, "RELEASED");
    const after = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const refundRequired = to === "CANCELLED" && ["PAID", "PARTIALLY_REFUNDED"].includes(before.paymentStatus) &&
      (before.amountPaidCents ?? before.totalCents) > before.refundedCents;
    await recordAudit(tx, {
      action: to === "CANCELLED" ? "ORDER_CANCELLED" : "ORDER_STATUS_CHANGED", entityType: "Order", entityId: orderId, admin,
      before: orderView(before), after: { ...orderView(after), reservationReleased: unpaidCancel, refundRequired },
      details: `Order ${before.orderNumber}: ${before.orderStatus} to ${to}`
    });
    return { order: after, refundRequired };
  });
}

/** Re-send the confirmation emails for a PAID order. The audit row records the outcome (no addresses). */
export async function resendEmails(orderId: string, admin: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true, paymentStatus: true } });
  if (!order) throw new AdminHttpError(404, "Order not found.");
  if (order.paymentStatus !== "PAID") throw new AdminHttpError(422, "Emails can only be re-sent for paid orders.");
  const result = await resendOrderEmails(orderId, { force: true });
  await db.$transaction((tx) => recordAudit(tx, {
    action: "ORDER_EMAILS_RESENT", entityType: "Order", entityId: orderId, admin,
    after: { customer: result.customer, business: result.business }, details: `Re-sent emails for order ${order.orderNumber}`
  }));
  return result;
}
