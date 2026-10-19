import { jsonNoStore, requireAdmin, requireWritableAdmin } from "@/lib/admin-route";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VALID_STATUSES = [
  "RECEIVED",
  "PAID",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED"
] as const;

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const readOnly = requireWritableAdmin();
  if (readOnly) return readOnly;
  try {
    const { searchParams } = new URL(request.url);
    const branchSlug = searchParams.get("branch");
    const status = searchParams.get("status");

    const where: Prisma.OrderWhereInput = {};
    if (branchSlug) {
      where.storeBranch = { slug: branchSlug };
    }
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      where.orderStatus = status;
    }

    const orders = await db.order.findMany({
      where,
      include: { storeBranch: true },
      orderBy: { createdAt: "desc" }
    });

    return jsonNoStore(orders);
  } catch {
    console.error("Admin orders query failed");
    return jsonNoStore({ error: "Failed to fetch orders" }, 500);
  }
}

export async function PATCH(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const readOnly = requireWritableAdmin();
  if (readOnly) return readOnly;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return jsonNoStore({ error: "Invalid request origin" }, 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: "Invalid JSON body" }, 400);
  }

  try {
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonNoStore({ error: "Invalid request body" }, 400);
    const { orderId, orderStatus } = body as Record<string, unknown>;

    if (!orderId || typeof orderId !== "string") {
      return jsonNoStore({ error: "orderId is required" }, 400);
    }

    if (typeof orderStatus !== "string" || !(VALID_STATUSES as readonly string[]).includes(orderStatus)) {
      return jsonNoStore(
        { error: `Invalid orderStatus. Must be one of: ${VALID_STATUSES.join(", ")}` },
        400
      );
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: { orderStatus }
    });

    return jsonNoStore({ success: true, order: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return jsonNoStore({ error: "Order not found" }, 404);
    }
    console.error("Failed to update order status");
    return jsonNoStore({ error: "Failed to update order" }, 500);
  }
}
