import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  isValidEmail,
  normalizeContact,
  parseRequestedItems,
  priceItems,
  quoteDelivery,
  resolvePaymentMethod
} from "@/lib/checkout-pricing";

const MAX_ORDER_NUMBER_ATTEMPTS = 5;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return bad("Invalid request body.");
  }

  try {
    const payment = resolvePaymentMethod(body.paymentMethod);
    if (!payment.ok) return bad(payment.error);

    const requested = parseRequestedItems(body.items);
    if (!requested.ok) return bad(requested.error);

    const contact = normalizeContact(body);
    if (!contact.customerName || !contact.customerEmail || !contact.customerPhone) {
      return bad("Please provide your full name, email, and contact phone number.");
    }
    if (!isValidEmail(contact.customerEmail)) {
      return bad("Please provide a valid email address.");
    }

    const isDelivery = body.fulfillmentType === "DELIVERY";
    const branchSlug = typeof body.branchSlug === "string" && body.branchSlug ? body.branchSlug : "rockdale";

    let branch =
      (await db.storeBranch.findUnique({ where: { slug: branchSlug } })) ??
      (await db.storeBranch.findFirst({ where: { isActive: true } }));
    if (!branch) return bad("Store branch not found.", 404);

    // Resolve delivery dispatch branch first so availability is checked at the real fulfilling branch.
    let deliveryFee = 0;
    let subtotalForQuote: number | null = null;

    const ids = requested.items.map((i) => i.id);
    const products = await db.product.findMany({ where: { id: { in: ids } } });

    const priceAt = async (branchId: string) => {
      const inv = await db.branchInventory.findMany({
        where: { storeBranchId: branchId, productId: { in: ids }, isAvailable: true },
        select: { productId: true }
      });
      return priceItems(requested.items, products, new Set(inv.map((r) => r.productId)));
    };

    let priced = await priceAt(branch.id);
    if (!priced.ok) return bad(priced.error);
    subtotalForQuote = priced.subtotal;

    if (isDelivery) {
      if (!contact.deliveryAddress || !contact.deliveryPostcode) {
        return bad("A valid delivery street address and Sydney postcode are required.");
      }
      const quote = quoteDelivery(contact.deliveryPostcode, subtotalForQuote);
      if (!quote.ok) return bad(quote.error);
      deliveryFee = quote.deliveryFee;

      if (quote.assignedBranch) {
        const assigned = await db.storeBranch.findUnique({ where: { slug: quote.assignedBranch } });
        if (assigned && assigned.id !== branch.id) {
          branch = assigned;
          priced = await priceAt(branch.id);
          if (!priced.ok) return bad(priced.error);
        }
      }
    }

    const subtotal = priced.subtotal;
    const total = Number((subtotal + deliveryFee).toFixed(2));

    for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt++) {
      const orderNumber = `FS-${randomInt(100000, 1000000)}`;
      try {
        const order = await db.order.create({
          data: {
            orderNumber,
            fulfillmentType: isDelivery ? "DELIVERY" : "PICKUP",
            storeBranchId: branch.id,
            customerName: contact.customerName,
            customerEmail: contact.customerEmail,
            customerPhone: contact.customerPhone,
            deliveryAddress: isDelivery ? contact.deliveryAddress : null,
            deliveryPostcode: isDelivery ? contact.deliveryPostcode : null,
            deliveryNotes: contact.deliveryNotes || null,
            pickupTimeslot: isDelivery ? null : contact.pickupTimeslot || "Today 2:00 PM - 5:00 PM",
            itemsJson: JSON.stringify(priced.lines),
            subtotal,
            deliveryFee,
            total,
            paymentMethod: payment.method,
            paymentStatus: "PENDING",
            orderStatus: "RECEIVED"
          }
        });
        return NextResponse.json({
          success: true,
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: order.total
        });
      } catch (err) {
        const isCollision = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isCollision) throw err;
      }
    }

    console.error("Order number generation exhausted retries");
    return bad("Failed to place order. Please try again.", 500);
  } catch (error) {
    console.error("Order creation failed:", error);
    return bad("Failed to place order. Please try again.", 500);
  }
}
