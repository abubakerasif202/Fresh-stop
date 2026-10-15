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
    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      where.orderStatus = status;
    }

    const orders = await db.order.findMany({
      where,
      include: { storeBranch: true },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(orders);
  } catch {
    console.error("Admin orders query failed");
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    const { orderId, orderStatus } = body as Record<string, unknown>;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    if (typeof orderStatus !== "string" || !(VALID_STATUSES as readonly string[]).includes(orderStatus)) {
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    console.error("Failed to update order status");
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
