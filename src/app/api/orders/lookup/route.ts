import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = typeof body?.orderNumber === "string" ? body.orderNumber.trim().toUpperCase() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!orderNumber || !email) {
      return NextResponse.json({ error: "Please enter your Order Reference Number and Email." }, { status: 400 });
    }

    const order = await db.order.findFirst({
      where: {
        orderNumber,
        customerEmail: { equals: email, mode: "insensitive" }
      },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        paymentStatus: true,
        fulfillmentType: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        createdAt: true,
        preferredDeliveryDate: true,
        storeBranch: { select: { name: true, suburb: true } }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "No matching order found for this order number and email." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error("Order lookup error:", err);
    return NextResponse.json({ error: "Unable to lookup order." }, { status: 500 });
  }
}
