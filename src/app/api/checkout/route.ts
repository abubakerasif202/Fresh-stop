import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sharedRateLimit, getClientIp } from "@/lib/rate-limit";
import { checkoutOrderId, sameCheckoutRequest, type CheckoutRequestInput } from "@/lib/checkout-idempotency";
import { checkDeliveryEligibility } from "@/lib/delivery";
import { signOrderToken } from "@/lib/order-token";
import { isValidPickupSlot } from "@/lib/pickup-slots";
import {
  isValidEmail,
  normalizeContact,
  parseRequestedItems,
  priceItems,
  quoteDelivery,
  resolvePaymentMethod
} from "@/lib/checkout-pricing";

const MAX_ORDER_NUMBER_ATTEMPTS = 5;

const NO_STORE = { "Cache-Control": "no-store" };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: NO_STORE });

const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = await sharedRateLimit(`checkout:${getClientIp(request.headers)}`, {
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.unavailable ? "Ordering is temporarily unavailable. Please try again shortly." : "Too many order attempts. Please wait a few minutes and try again." },
      { status: limit.unavailable ? 503 : 429, headers: { ...NO_STORE, "Retry-After": String(Math.max(1, Math.ceil(limit.retryAfterSec))) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return bad("Invalid request body.");
  }

  try {
    if (!signOrderToken("checkout-preflight")) return bad("Ordering is temporarily unavailable. Please contact the store.", 503);
    const key = request.headers.get("Idempotency-Key");
    const idempotentId = checkoutOrderId(key);
    if (key && !idempotentId) return bad("Invalid checkout request identifier.");
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
    if (!/^[+()\d\s-]{8,30}$/.test(contact.customerPhone) || contact.customerPhone.replace(/\D/g, "").length < 8) {
      return bad("Please provide a valid contact phone number.");
    }
    if (body.fulfillmentType !== "DELIVERY" && body.fulfillmentType !== "PICKUP") return bad("Please choose pickup or delivery.");

    const isDelivery = body.fulfillmentType === "DELIVERY";
    const requestInput: CheckoutRequestInput = {
      ...contact, fulfillmentType: body.fulfillmentType,
      branchSlug: typeof body.branchSlug === "string" ? body.branchSlug : "",
      paymentMethod: payment.method, items: requested.items
    };
    const responseFor = (order: { id: string; orderNumber: string; total: number }) => NextResponse.json({
      success: true, orderId: order.id, orderNumber: order.orderNumber,
      total: order.total, confirmationToken: signOrderToken(order.id)
    }, { headers: NO_STORE });
    // Recover a committed request before checking mutable stock, prices or pickup slots.
    if (idempotentId) {
      const existing = await db.order.findUnique({ where: { id: idempotentId }, include: { storeBranch: { select: { slug: true } } } });
      if (existing) return sameCheckoutRequest(existing, requestInput) ? responseFor(existing) : bad("This checkout request has already been used. Please refresh and try again.", 409);
    }
    if (!isDelivery && !isValidPickupSlot(contact.pickupTimeslot)) {
      return bad("That pickup time is no longer available. Please choose another slot.");
    }
    // Every persisted checkout needs a retry identity, including API clients.
    if (!idempotentId) return bad("A checkout request identifier is required. Please refresh and try again.");
    let branchSlug = typeof body.branchSlug === "string" ? body.branchSlug : "";
    if (isDelivery) {
      if (!contact.deliveryAddress || !contact.deliveryPostcode) return bad("A valid delivery street address and Sydney postcode are required.");
      const eligibility = checkDeliveryEligibility(contact.deliveryPostcode, 0);
      if (!eligibility.eligible || !eligibility.assignedBranch) return bad(eligibility.message);
      branchSlug = eligibility.assignedBranch;
    }
    const branch = await db.storeBranch.findFirst({ where: { slug: branchSlug, isActive: true } });
    if (!branch) return bad("Store branch not found.", 404);

    // Resolve delivery dispatch branch first so availability is checked at the real fulfilling branch.
    let deliveryFee = 0;

    const ids = requested.items.map((i) => i.id);
    const products = await db.product.findMany({ where: { id: { in: ids } } });

    const priceAt = async (branchId: string) => {
      const inv = await db.branchInventory.findMany({
        where: { storeBranchId: branchId, productId: { in: ids }, isAvailable: true },
        select: { productId: true }
      });
      return priceItems(requested.items, products, new Set(inv.map((r) => r.productId)));
    };

    const priced = await priceAt(branch.id);
    if (!priced.ok) return bad(priced.error);

    if (isDelivery) {
      const quote = quoteDelivery(contact.deliveryPostcode, priced.subtotal);
      if (!quote.ok) return bad(quote.error);
      deliveryFee = quote.deliveryFee;
    }

    const subtotal = priced.subtotal;
    const total = Number((subtotal + deliveryFee).toFixed(2));

    const orderInput = {
      fulfillmentType: isDelivery ? "DELIVERY" : "PICKUP",
      storeBranchId: branch.id,
      customerName: contact.customerName,
      customerEmail: contact.customerEmail,
      customerPhone: contact.customerPhone,
      deliveryAddress: isDelivery ? contact.deliveryAddress : null,
      deliveryPostcode: isDelivery ? contact.deliveryPostcode : null,
      deliveryNotes: contact.deliveryNotes || null,
      pickupTimeslot: isDelivery ? null : contact.pickupTimeslot,
      itemsJson: JSON.stringify(priced.lines),
      subtotal,
      deliveryFee,
      total,
      paymentMethod: payment.method
    };
    for (let attempt = 0; attempt < MAX_ORDER_NUMBER_ATTEMPTS; attempt++) {
      const orderNumber = `FS-${randomInt(100000, 1000000)}`;
      try {
        const order = await db.order.create({ data: {
          ...orderInput, id: idempotentId, orderNumber,
          paymentStatus: "PENDING", orderStatus: "RECEIVED"
        } });
        return responseFor(order);
      } catch (err) {
        const isCollision = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
        if (!isCollision) throw err;
        if (idempotentId) {
          const existing = await db.order.findUnique({ where: { id: idempotentId }, include: { storeBranch: { select: { slug: true } } } });
          if (existing) return sameCheckoutRequest(existing, requestInput) ? responseFor(existing) : bad("This checkout request has already been used.", 409);
        }
      }
    }

    console.error("Order number generation exhausted retries");
    return bad("Failed to place order. Please try again.", 500);
  } catch {
    console.error("Order creation failed");
    return bad("Failed to place order. Please try again.", 500);
  }
}
