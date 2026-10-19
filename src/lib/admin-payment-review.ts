import { db } from "./db";
import { AdminHttpError, recordAudit } from "./admin-audit";
import { MIN_OVERRIDE_REASON } from "./admin-pricing";

export const FLAG_ACTIONS = ["PAYMENT_NEEDS_REVIEW", "PAYMENT_FLAGGED"] as const;
export const ACK_ACTION = "PAYMENT_REVIEW_ACKNOWLEDGED";
const WEBHOOK_USER = "stripe-webhook";
const LIMIT = 50;

export interface PaymentFlag { id: string; orderId: string; orderNumber: string | null; action: string; code: string; createdAt: Date }
export interface FailedPaymentEvent { id: string; eventType: string; code: string; createdAt: Date }

/** Pull a reason code (for example AMOUNT_MISMATCH) from webhook audit details. Never returns free text or PII. */
export function reasonCode(details: string | null): string {
  if (!details) return "UNKNOWN";
  try {
    const parsed = JSON.parse(details) as { reason?: unknown; review?: unknown };
    const raw = typeof parsed.reason === "string" ? parsed.reason : typeof parsed.review === "string" ? parsed.review : null;
    return raw && /^[A-Z0-9_]{2,60}/.test(raw) ? (/^[A-Z0-9_]+/.exec(raw) as RegExpExecArray)[0] : "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}

/** Webhook flags with no later admin acknowledgement on the same order, plus FAILED payment events. */
export async function loadPaymentReview(): Promise<{ flags: PaymentFlag[]; failedEvents: FailedPaymentEvent[] }> {
  const rows = await db.adminAuditLog.findMany({
    where: { action: { in: [...FLAG_ACTIONS] }, adminUser: WEBHOOK_USER, entityType: "Order", entityId: { not: null } },
    orderBy: { createdAt: "desc" }, take: 500
  });
  const ids = [...new Set(rows.map((r) => r.entityId as string))];
  const [acks, orders, events] = await Promise.all([
    db.adminAuditLog.findMany({ where: { action: ACK_ACTION, entityType: "Order", entityId: { in: ids } }, select: { entityId: true, createdAt: true } }),
    db.order.findMany({ where: { id: { in: ids } }, select: { id: true, orderNumber: true } }),
    db.paymentEvent.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: LIMIT, select: { id: true, eventType: true, lastError: true, createdAt: true } })
  ]);
  const numbers = new Map(orders.map((o) => [o.id, o.orderNumber]));
  const lastAck = new Map<string, number>();
  for (const a of acks) lastAck.set(a.entityId as string, Math.max(lastAck.get(a.entityId as string) ?? 0, a.createdAt.getTime()));
  const flags = rows
    .filter((r) => (lastAck.get(r.entityId as string) ?? 0) < r.createdAt.getTime())
    .slice(0, LIMIT)
    .map((r) => ({ id: r.id, orderId: r.entityId as string, orderNumber: numbers.get(r.entityId as string) ?? null, action: r.action, code: reasonCode(r.details), createdAt: r.createdAt }));
  return {
    flags,
    failedEvents: events.map((e) => ({ id: e.id, eventType: e.eventType, code: (/^[A-Z0-9_]+/.exec(e.lastError ?? "") ?? ["UNKNOWN"])[0], createdAt: e.createdAt }))
  };
}

export async function countPaymentReview(): Promise<number> {
  const { flags, failedEvents } = await loadPaymentReview();
  return new Set(flags.map((f) => f.orderId)).size + failedEvents.length;
}

/** Record that an admin looked at the flags on an order. Touches no order or payment field. */
export function acknowledgePaymentReview(orderId: string, reason: unknown, admin: string) {
  const note = typeof reason === "string" ? reason.trim() : "";
  if (note.length < MIN_OVERRIDE_REASON || note.length > 300) {
    throw new AdminHttpError(422, "Give a reason of 10 to 300 characters.", { field: "reason" });
  }
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true } });
    if (!order) throw new AdminHttpError(404, "Order not found.");
    const open = await tx.adminAuditLog.count({ where: { entityType: "Order", entityId: orderId, action: { in: [...FLAG_ACTIONS] }, adminUser: WEBHOOK_USER } });
    if (open === 0) throw new AdminHttpError(422, "This order has no payment flags to acknowledge.");
    await recordAudit(tx, {
      action: ACK_ACTION, entityType: "Order", entityId: orderId, admin, after: { reason: note },
      details: `Acknowledged payment review for order ${order.orderNumber}`
    });
  });
}
