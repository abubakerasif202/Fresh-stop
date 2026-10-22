import type Stripe from "stripe";
import type { Order, Prisma } from "@prisma/client";
import { commitReservation, releaseReservation } from "./inventory";
import { getStripeAccountId, getStripeMode } from "./stripe";

export type Tx = Prisma.TransactionClient;

export const WEBHOOK_AUDIT_USER = "stripe-webhook";

/** PROCESSED = handled (lastError may carry a NEEDS_REVIEW flag); IGNORED = not ours / not actionable; FLAGGED = permanent anomaly kept for admin review. */
export type HandlerOutcome =
  | { status: "PROCESSED"; lastError?: string; emailOrderId?: string }
  | { status: "IGNORED"; reason: string }
  | { status: "FLAGGED"; reason: string };

/** Thrown for conditions that may resolve on a Stripe retry. The webhook answers 500. */
export class TransientWebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransientWebhookError";
  }
}

interface Ctx {
  tx: Tx;
  event: Stripe.Event;
  now: Date;
}

const PROCESSED_NOOP: HandlerOutcome = { status: "PROCESSED" };
const PAYABLE_STATES = ["PENDING", "FAILED", "EXPIRED"];
const CANCELLABLE_STATES = ["PENDING", "FAILED"];
const REFUNDABLE_STATES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"];

async function writeAudit(
  ctx: Ctx,
  action: string,
  orderId: string,
  details: Record<string, unknown>,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>
): Promise<void> {
  await ctx.tx.adminAuditLog.create({
    data: {
      action,
      entityType: "Order",
      entityId: orderId,
      adminUser: WEBHOOK_AUDIT_USER,
      details: JSON.stringify({ eventId: ctx.event.id, eventType: ctx.event.type, ...details }),
      beforeJson: before ? JSON.stringify(before) : null,
      afterJson: after ? JSON.stringify(after) : null
    }
  });
}

async function flag(ctx: Ctx, order: Order | null, reason: string, details: Record<string, unknown> = {}): Promise<HandlerOutcome> {
  if (order) await writeAudit(ctx, "PAYMENT_FLAGGED", order.id, { reason, ...details });
  console.warn(`[stripe-webhook] flagged event=${ctx.event.id} type=${ctx.event.type} reason=${reason}`);
  return { status: "FLAGGED", reason };
}

function sessionOrderId(session: Stripe.Checkout.Session): string | null {
  return session.client_reference_id || session.metadata?.orderId || null;
}

async function findSessionOrder(ctx: Ctx, session: Stripe.Checkout.Session): Promise<Order | null> {
  const orderId = sessionOrderId(session);
  if (orderId) await ctx.tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  return orderId ? ctx.tx.order.findUnique({ where: { id: orderId } }) : null;
}

/** Session must be the one this order created. A not-yet-recorded session id is treated as transient. */
function sessionBindingProblem(order: Order, session: Stripe.Checkout.Session): string | null {
  if (order.stripeAccountId && order.stripeAccountId !== getStripeAccountId()) return "ORDER_ACCOUNT_MISMATCH";
  if (session.client_reference_id && session.metadata?.orderId && session.client_reference_id !== session.metadata.orderId) return "ORDER_REFERENCE_MISMATCH";
  if (!order.stripeSessionId) throw new TransientWebhookError("ORDER_SESSION_NOT_RECORDED");
  return order.stripeSessionId === session.id ? null : "WRONG_SESSION";
}

function paidSessionProblem(order: Order, session: Stripe.Checkout.Session): string | null {
  const binding = sessionBindingProblem(order, session);
  if (binding) return binding;
  if (order.stripePaymentIntentId && order.stripePaymentIntentId !== paymentIntentId(session)) return "WRONG_PAYMENT_INTENT";
  if ((session.currency ?? "").toLowerCase() !== "aud" || order.currency.toLowerCase() !== "aud") return "CURRENCY_MISMATCH";
  if (session.amount_total !== order.totalCents) return "AMOUNT_MISMATCH";
  return null;
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const pi = session.payment_intent;
  return typeof pi === "string" ? pi : (pi?.id ?? null);
}

/** Commits the reservation (a lapsed one is re-claimed only if stock is still free); returns a NEEDS_REVIEW note otherwise. */
async function commitOrFlagStock(ctx: Ctx, order: Order): Promise<string | undefined> {
  await ctx.tx.$executeRaw`SAVEPOINT payment_stock_reconciliation`;
  const result = await commitReservation(ctx.tx, order.id);
  if (result.shortfalls.length > 0) {
    await ctx.tx.$executeRaw`ROLLBACK TO SAVEPOINT payment_stock_reconciliation`;
    await ctx.tx.$executeRaw`RELEASE SAVEPOINT payment_stock_reconciliation`;
    return "NEEDS_REVIEW: stock shortfall while committing a lapsed reservation; no stock changes committed";
  }
  await ctx.tx.$executeRaw`RELEASE SAVEPOINT payment_stock_reconciliation`;
  if (!result.noop) return undefined;
  const committed = await ctx.tx.inventoryReservation.count({ where: { orderId: order.id, status: "COMMITTED" } });
  return committed > 0 ? undefined : "NEEDS_REVIEW: payment received but the order has no stock reservation";
}

async function markOrderPaid(ctx: Ctx, order: Order, session: Stripe.Checkout.Session): Promise<HandlerOutcome> {
  const accountId = ctx.event.account ?? getStripeAccountId();
  const claimed = await ctx.tx.order.updateMany({
    where: { id: order.id, paymentStatus: { in: PAYABLE_STATES } },
    data: {
      paymentStatus: "PAID",
      paidAt: ctx.now,
      amountPaidCents: session.amount_total,
      stripePaymentIntentId: paymentIntentId(session) ?? order.stripePaymentIntentId,
      ...(accountId ? { stripeAccountId: accountId } : {})
    }
  });
  if (claimed.count === 0) return PROCESSED_NOOP;

  const manualCancellation = order.orderStatus === "CANCELLED" && await ctx.tx.adminAuditLog.findFirst({
    where: { entityType: "Order", entityId: order.id, action: { in: ["ORDER_CANCELLED", "CUSTOMER_ORDER_CANCELLED"] } },
    select: { id: true }
  });
  // Only expiry can safely revive fulfilment. Released/unknown cancellations need a human decision.
  const nonExpiryCancellation = order.orderStatus === "CANCELLED" && (manualCancellation || order.paymentStatus !== "EXPIRED" ||
    await ctx.tx.inventoryReservation.count({ where: { orderId: order.id, status: "EXPIRED" } }) === 0);
  const review = nonExpiryCancellation
    ? "NEEDS_REVIEW: payment received after an explicit or unclassified cancellation"
    : await commitOrFlagStock(ctx, order);
  const promote = !review && ["PENDING_PAYMENT", "CANCELLED"].includes(order.orderStatus);
  if (promote) {
    await ctx.tx.order.update({ where: { id: order.id }, data: { orderStatus: "RECEIVED", cancelledAt: null } });
  }
  await writeAudit(
    ctx,
    review ? "PAYMENT_NEEDS_REVIEW" : "PAYMENT_PAID",
    order.id,
    { review: review ?? null, amountCents: session.amount_total },
    { paymentStatus: order.paymentStatus, orderStatus: order.orderStatus },
    { paymentStatus: "PAID", orderStatus: promote ? "RECEIVED" : order.orderStatus }
  );
  return review ? { status: "PROCESSED", lastError: review } : { status: "PROCESSED", emailOrderId: order.id };
}

async function handleCheckoutPaid(ctx: Ctx, session: Stripe.Checkout.Session): Promise<HandlerOutcome> {
  if (session.payment_status !== "paid") return PROCESSED_NOOP; // completed but unpaid: wait for the async event
  const order = await findSessionOrder(ctx, session);
  if (!order) return flag(ctx, null, "ORDER_NOT_FOUND");
  const problem = paidSessionProblem(order, session);
  if (problem) {
    return flag(ctx, order, problem, { expectedCents: order.totalCents, receivedCents: session.amount_total, currency: session.currency });
  }
  // Already paid: no state change, but let post-commit email retry any unsent (claim-guarded) message.
  if (order.paymentStatus === "PAID") return order.orderStatus === "CANCELLED" || order.orderStatus === "PENDING_PAYMENT"
    ? PROCESSED_NOOP : { status: "PROCESSED", emailOrderId: order.id };
  if (!PAYABLE_STATES.includes(order.paymentStatus)) return PROCESSED_NOOP;
  return markOrderPaid(ctx, order, session);
}

async function cancelUnpaid(
  ctx: Ctx,
  session: Stripe.Checkout.Session,
  target: { paymentStatus: "FAILED" | "EXPIRED"; release: "RELEASED" | "EXPIRED"; action: string }
): Promise<HandlerOutcome> {
  const order = await findSessionOrder(ctx, session);
  if (!order) return flag(ctx, null, "ORDER_NOT_FOUND");
  const problem = sessionBindingProblem(order, session);
  if (problem) return flag(ctx, order, problem);
  const changed = await ctx.tx.order.updateMany({
    where: { id: order.id, paymentStatus: { in: CANCELLABLE_STATES } },
    data: { paymentStatus: target.paymentStatus, orderStatus: "CANCELLED", cancelledAt: ctx.now }
  });
  if (changed.count === 0) return PROCESSED_NOOP; // PAID or already terminal: never downgrade
  await releaseReservation(ctx.tx, order.id, target.release);
  await writeAudit(
    ctx,
    target.action,
    order.id,
    {},
    { paymentStatus: order.paymentStatus, orderStatus: order.orderStatus },
    { paymentStatus: target.paymentStatus, orderStatus: "CANCELLED" }
  );
  return PROCESSED_NOOP;
}

async function handlePaymentIntentFailed(ctx: Ctx, intent: Stripe.PaymentIntent): Promise<HandlerOutcome> {
  const metaOrderId = intent.metadata?.orderId;
  const order = metaOrderId
    ? await ctx.tx.order.findUnique({ where: { id: metaOrderId } })
    : await ctx.tx.order.findFirst({ where: { stripePaymentIntentId: intent.id } });
  if (!order) return { status: "IGNORED", reason: "ORDER_NOT_FOUND" };
  await ctx.tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
  if (order.stripeAccountId && order.stripeAccountId !== getStripeAccountId()) return flag(ctx, order, "ORDER_ACCOUNT_MISMATCH");
  if (order.stripePaymentIntentId && order.stripePaymentIntentId !== intent.id) return flag(ctx, order, "WRONG_PAYMENT_INTENT");
  // A declined attempt does not end the Checkout Session (the customer may retry), so only the
  // payment status is recorded; reservation release is left to session expiry / async failure.
  const changed = await ctx.tx.order.updateMany({
    where: { id: order.id, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED", stripePaymentIntentId: order.stripePaymentIntentId ?? intent.id }
  });
  if (changed.count === 0) return PROCESSED_NOOP;
  await writeAudit(ctx, "PAYMENT_FAILED", order.id, {}, { paymentStatus: "PENDING" }, { paymentStatus: "FAILED" });
  return PROCESSED_NOOP;
}

async function handleChargeRefunded(ctx: Ctx, charge: Stripe.Charge): Promise<HandlerOutcome> {
  const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  const found = intent ? await ctx.tx.order.findFirst({ where: { stripePaymentIntentId: intent } }) : null;
  // Refund delivery may precede checkout success, which records the payment intent.
  // Keep it retryable instead of acknowledging and permanently losing the refund.
  if (!found) throw new TransientWebhookError("REFUND_ORDER_NOT_RECONCILED");
  await ctx.tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${found.id} FOR UPDATE`;
  const order = await ctx.tx.order.findUniqueOrThrow({ where: { id: found.id } });
  if (order.stripeAccountId && order.stripeAccountId !== getStripeAccountId()) return flag(ctx, order, "ORDER_ACCOUNT_MISMATCH");
  if (!REFUNDABLE_STATES.includes(order.paymentStatus)) throw new TransientWebhookError("REFUND_PAYMENT_NOT_RECONCILED");
  const refunded = Math.max(order.refundedCents, charge.amount_refunded);
  const basis = order.amountPaidCents ?? order.totalCents;
  if (charge.currency !== "aud" || !Number.isSafeInteger(charge.amount_refunded) || charge.amount_refunded < 0 || charge.amount_refunded > basis) {
    return flag(ctx, order, "INVALID_REFUND_AMOUNT_OR_CURRENCY");
  }
  const status = refunded >= basis ? "REFUNDED" : refunded > 0 ? "PARTIALLY_REFUNDED" : order.paymentStatus;
  if (refunded === order.refundedCents && status === order.paymentStatus) return PROCESSED_NOOP;
  await ctx.tx.order.update({ where: { id: order.id }, data: { refundedCents: refunded, paymentStatus: status } });
  await writeAudit(
    ctx,
    "PAYMENT_REFUND_RECORDED",
    order.id,
    { refundedCents: refunded },
    { paymentStatus: order.paymentStatus, refundedCents: order.refundedCents },
    { paymentStatus: status, refundedCents: refunded }
  );
  return PROCESSED_NOOP;
}

/** Runs inside the caller's transaction. Throws TransientWebhookError / DB errors for retryable failures. */
export async function handleStripeEvent(tx: Tx, event: Stripe.Event, now: Date = new Date()): Promise<HandlerOutcome> {
  const ctx: Ctx = { tx, event, now };
  if (event.livemode !== (getStripeMode() === "live")) return { status: "IGNORED", reason: event.livemode ? "LIVEMODE_REJECTED" : "TESTMODE_REJECTED" };
  const expected = getStripeAccountId();
  if (expected && event.account && event.account !== expected) return flag(ctx, null, "ACCOUNT_MISMATCH");

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutPaid(ctx, event.data.object);
    case "checkout.session.async_payment_failed":
      return cancelUnpaid(ctx, event.data.object, { paymentStatus: "FAILED", release: "RELEASED", action: "PAYMENT_ASYNC_FAILED" });
    case "checkout.session.expired":
      return cancelUnpaid(ctx, event.data.object, { paymentStatus: "EXPIRED", release: "EXPIRED", action: "CHECKOUT_EXPIRED" });
    case "payment_intent.payment_failed":
      return handlePaymentIntentFailed(ctx, event.data.object);
    case "charge.refunded":
      return handleChargeRefunded(ctx, event.data.object);
    default:
      return { status: "IGNORED", reason: "UNHANDLED_EVENT_TYPE" };
  }
}
