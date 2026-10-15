import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VALID_STATUSES = ["RECEIVED", "PREPARING", "READY", "DISPATCHED", "COMPLETED", "CANCELLED"] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchSlug = searchParams.get("branch");
    const status = searchParams.get("status");

    const where: Prisma.OrderWhereInput = {};
    if (branchSlug) {
      where.storeBranch = { slug: branchSlug };
    }
    if (status) {
      where.orderStatus = status;
    }

    const orders = await db.order.findMany({
      where,
      include: { storeBranch: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Admin orders query failed:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, orderStatus } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    if (!orderStatus || !VALID_STATUSES.includes(orderStatus)) {
      return NextResponse.json(
        { error: `Invalid orderStatus. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: { orderStatus }
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error("Failed to update order status:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
