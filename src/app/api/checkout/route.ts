import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkDeliveryEligibility } from "@/lib/delivery";

interface CartItemInput {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  imageUrl?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fulfillmentType,
      branchSlug,
      customerName,
      customerEmail,
      customerPhone,
      deliveryAddress,
      deliveryPostcode,
      deliveryNotes,
      pickupTimeslot,
      items,
      paymentMethod
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your shopping basket is empty." }, { status: 400 });
    }

    if (!customerName?.trim() || !customerEmail?.trim() || !customerPhone?.trim()) {
      return NextResponse.json(
        { error: "Please provide your full name, email, and contact phone number." },
        { status: 400 }
      );
    }

    // Determine target branch
    let branch = await db.storeBranch.findUnique({
      where: { slug: branchSlug || "rockdale" }
    });

    if (!branch) {
      branch = await db.storeBranch.findFirst({ where: { isActive: true } });
    }

    if (!branch) {
      return NextResponse.json({ error: "Store branch not found." }, { status: 404 });
    }

    const subtotal = Number(
      items
        .reduce((sum: number, it: CartItemInput) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
        .toFixed(2)
    );

    let deliveryFee = 0.0;

    if (fulfillmentType === "DELIVERY") {
      const cleanPostcode = deliveryPostcode?.trim();
      const cleanAddress = deliveryAddress?.trim();

      if (!cleanAddress || !cleanPostcode) {
        return NextResponse.json(
          { error: "A valid delivery street address and Sydney postcode are required." },
          { status: 400 }
        );
      }

      const deliveryCheck = checkDeliveryEligibility(cleanPostcode, subtotal);
      if (!deliveryCheck.eligible) {
        return NextResponse.json({ error: deliveryCheck.message }, { status: 400 });
      }

      if (!deliveryCheck.meetsMinimumSpend) {
        return NextResponse.json({ error: deliveryCheck.message }, { status: 400 });
      }

      deliveryFee = deliveryCheck.deliveryFee;

      // Assign nearest dispatch branch for delivery
      if (deliveryCheck.assignedBranch) {
        const assigned = await db.storeBranch.findUnique({
          where: { slug: deliveryCheck.assignedBranch }
        });
        if (assigned) branch = assigned;
      }
    }

    const total = Number((subtotal + deliveryFee).toFixed(2));
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `FS-${randomSuffix}`;

    const order = await db.order.create({
      data: {
        orderNumber,
        fulfillmentType: fulfillmentType === "DELIVERY" ? "DELIVERY" : "PICKUP",
        storeBranchId: branch.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: fulfillmentType === "DELIVERY" ? deliveryAddress?.trim() : null,
        deliveryPostcode: fulfillmentType === "DELIVERY" ? deliveryPostcode?.trim() : null,
        deliveryNotes: deliveryNotes?.trim() || null,
        pickupTimeslot: fulfillmentType === "PICKUP" ? pickupTimeslot?.trim() || "Today 2:00 PM - 5:00 PM" : null,
        itemsJson: JSON.stringify(items),
        subtotal,
        deliveryFee,
        total,
        paymentMethod: paymentMethod === "STRIPE" ? "STRIPE" : "PAY_ON_PICKUP",
        paymentStatus: paymentMethod === "STRIPE" ? "PAID" : "PENDING",
        orderStatus: "RECEIVED"
      }
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: "Failed to place order. Please try again." }, { status: 500 });
  }
}
