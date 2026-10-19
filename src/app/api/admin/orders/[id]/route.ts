import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin, requireWritableAdmin } from "@/lib/admin-route";
import { adminErrorResponse, jsonError } from "@/lib/admin-audit";
import { maskRef, nextStatuses } from "@/lib/admin-orders";

type Ctx = { params: Promise<{ id: string }> };

/** Order detail for operators. Stripe identifiers are masked to their last 4 characters. */
export async function GET(request: Request, { params }: Ctx) {
  const denied = requireAdmin(request) ?? requireWritableAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!id || id.length > 64) return jsonError("Invalid order id.", 400);
  try {
    const order = await db.order.findUnique({
      where: { id },
      include: { storeBranch: { select: { name: true } }, orderItems: true, reservations: { select: { status: true, quantity: true, expiresAt: true } } }
    });
    if (!order) return jsonError("Order not found.", 404);
    const {
      stripeSessionId, stripePaymentIntentId, accessTokenHash: _hash, itemsJson: _items, stripeAccountId: _acct, ...safe
    } = order;
    void _hash; void _items; void _acct;
    return jsonNoStore({
      order: { ...safe, stripeSession: maskRef(stripeSessionId), stripePaymentIntent: maskRef(stripePaymentIntentId), nextStatuses: nextStatuses(order) }
    });
  } catch (error) {
    return adminErrorResponse(error, "Loading order");
  }
}
