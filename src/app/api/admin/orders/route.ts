import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin, requireWritableAdmin } from "@/lib/admin-route";
import { adminErrorResponse, guardAdminMutation, jsonError } from "@/lib/admin-audit";
import { acknowledgePaymentReview } from "@/lib/admin-payment-review";
import { ADMIN_ORDER_STATUSES, PAYMENT_STATUSES, assertNoPaymentFields, changeOrderStatus, maskRef, nextStatuses, resendEmails } from "@/lib/admin-orders";

const PAGE_SIZE = 25;
const inList = (list: readonly string[], v: string | null) => (v && list.includes(v) ? v : undefined);

export async function GET(request: Request) {
  const denied = requireAdmin(request) ?? requireWritableAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const where: Prisma.OrderWhereInput = {};
    const branch = searchParams.get("branch");
    if (branch && /^[a-z0-9-]{1,60}$/.test(branch)) where.storeBranch = { slug: branch };
    const orderStatus = inList(ADMIN_ORDER_STATUSES, searchParams.get("orderStatus") ?? searchParams.get("status"));
    const paymentStatus = inList(PAYMENT_STATUSES, searchParams.get("paymentStatus"));
    if (orderStatus) where.orderStatus = orderStatus;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    const page = Math.max(1, Math.min(10_000, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1));
    const [rows, total] = await Promise.all([
      db.order.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
        select: {
          id: true, orderNumber: true, createdAt: true, fulfillmentType: true, customerName: true, totalCents: true,
          paymentStatus: true, orderStatus: true, stripeSessionId: true, storeBranch: { select: { name: true } }
        }
      }),
      db.order.count({ where })
    ]);
    const orders = rows.map(({ stripeSessionId, ...o }) => ({ ...o, stripeSession: maskRef(stripeSessionId), nextStatuses: nextStatuses(o) }));
    return jsonNoStore({ orders, page, pageSize: PAGE_SIZE, total });
  } catch (error) {
    return adminErrorResponse(error, "Loading orders");
  }
}

/** PATCH {orderId, orderStatus} | {orderId, action:"status"|"cancel"|"resend_emails"}. */
export async function PATCH(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const { body, admin } = guard;
  try {
    assertNoPaymentFields(body);
    const { orderId, orderStatus } = body;
    if (!orderId || typeof orderId !== "string" || orderId.length > 64) return jsonError("orderId is required", 400);
    const action = body.action ?? "status";
    if (action === "acknowledge_payment") {
      await acknowledgePaymentReview(orderId, body.reason, admin);
      return jsonNoStore({ success: true });
    }
    if (action === "resend_emails") {
      const result = await resendEmails(orderId, admin);
      return jsonNoStore({ success: true, emails: result });
    }
    const target = action === "cancel" ? "CANCELLED" : orderStatus;
    if (action !== "status" && action !== "cancel") return jsonError("Invalid action.", 400);
    if (typeof target !== "string" || !(ADMIN_ORDER_STATUSES as readonly string[]).includes(target) || target === "PENDING_PAYMENT") {
      return jsonError(`Invalid orderStatus. Must be one of: ${ADMIN_ORDER_STATUSES.filter((s) => s !== "PENDING_PAYMENT").join(", ")}`, 400);
    }
    const { order, refundRequired } = await changeOrderStatus(orderId, target, admin);
    return jsonNoStore({ success: true, order: { id: order.id, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus }, refundRequired });
  } catch (error) {
    return adminErrorResponse(error, "Updating order");
  }
}
