import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { validateAndPriceOrder } from "@/lib/order-pricing";
import { SITE_URL } from "@/lib/site";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = body?.items;
    const customer = body?.customer;
    const fulfillmentType = body?.fulfillmentType || "DELIVERY";

    // Validate customer fields
    if (!customer || typeof customer !== "object") {
      return NextResponse.json({ error: "Customer details are required." }, { status: 400 });
    }

    const name = String(customer.name || "").trim();
    const email = String(customer.email || "").trim();
    const phone = String(customer.phone || "").trim();
    const address = String(customer.address || "").trim();
    const suburb = String(customer.suburb || "").trim();
    const postcode = String(customer.postcode || "").trim();
    const notes = String(customer.notes || "").trim();
    const preferredDeliveryDate = String(customer.preferredDeliveryDate || "").trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!phone || phone.length < 8) {
      return NextResponse.json({ error: "Please enter a valid Australian contact phone number." }, { status: 400 });
    }

    if (fulfillmentType === "DELIVERY") {
      if (!address || address.length < 3) {
        return NextResponse.json({ error: "Please enter your delivery street address." }, { status: 400 });
      }
      if (!suburb) {
        return NextResponse.json({ error: "Please enter your Sydney suburb." }, { status: 400 });
      }
      if (!postcode || !/^\d{4}$/.test(postcode)) {
        return NextResponse.json({ error: "Please enter a valid 4-digit Sydney postcode." }, { status: 400 });
      }
    }

    // 1. Validate pricing and stock strictly on server
    const validation = await validateAndPriceOrder(items, postcode, fulfillmentType);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // 2. Resolve store branch
    const branchSlug = validation.primaryBranchSlug || "rockdale";
    const branch = await db.storeBranch.findUnique({ where: { slug: branchSlug } });

    // 3. Generate unique order number
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `FS-${datePrefix}-${randomSuffix}`;

    // 4. Create or link customer record
    const customerRecord = await db.customer.upsert({
      where: { email },
      update: { name, phone },
      create: { email, name, phone }
    });

    // 5. Create pending order in database
    const order = await db.order.create({
      data: {
        orderNumber,
        fulfillmentType,
        storeBranchId: branch?.id || null,
        customerId: customerRecord.id,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        deliveryAddress: address,
        deliverySuburb: suburb,
        deliveryPostcode: postcode,
        deliveryNotes: notes,
        preferredDeliveryDate: preferredDeliveryDate || null,
        itemsJson: JSON.stringify(validation.items),
        subtotal: validation.subtotalDollars,
        deliveryFee: validation.deliveryFeeDollars,
        gstTotal: validation.gstTotalDollars,
        total: validation.totalDollars,
        totalCents: validation.totalCents,
        paymentMethod: "STRIPE",
        paymentStatus: "PENDING",
        orderStatus: "RECEIVED",
        orderItems: {
          create: validation.items.map((item) => ({
            productId: item.productId,
            name: item.name,
            slug: item.slug,
            quantity: item.quantity,
            unit: item.unit,
            priceCents: item.priceCents,
            totalCents: item.totalCents,
            taxCategory: item.taxCategory,
            taxCents: item.taxCents
          }))
        }
      }
    });

    // 6. Check Stripe configuration
    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json(
        {
          error: "Stripe payment gateway is not yet configured with API keys. Order created in pending state.",
          orderId: order.id,
          orderNumber: order.orderNumber,
          requiresKey: true
        },
        { status: 503 }
      );
    }

    // 7. Prepare Stripe Checkout line items
    const line_items: {
      price_data: {
        currency: string;
        product_data: {
          name: string;
          description?: string;
          images?: string[];
        };
        unit_amount: number;
      };
      quantity: number;
    }[] = validation.items.map((item) => {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;
      const fullImageUrl = item.imageUrl.startsWith("http")
        ? item.imageUrl
        : `${siteUrl}${item.imageUrl}`;

      return {
        price_data: {
          currency: "aud",
          product_data: {
            name: item.name,
            description: `${item.unit} ${item.taxCategory === "GST_FREE" ? "(GST Free)" : "(Includes 10% GST)"}`,
            images: [fullImageUrl]
          },
          unit_amount: item.priceCents
        },
        quantity: item.quantity
      };
    });

    // Add delivery fee line item if applicable
    if (validation.deliveryFeeCents > 0) {
      line_items.push({
        price_data: {
          currency: "aud",
          product_data: {
            name: `Sydney Delivery (${validation.zoneName || "Local Delivery"})`,
            description: "Fresh grocery temperature-controlled delivery"
          },
          unit_amount: validation.deliveryFeeCents
        },
        quantity: 1
      });
    }

    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || SITE_URL;

    // 8. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      customer_email: email,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: name,
        postcode
      },
      success_url: `${siteBase}/order-confirmation/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteBase}/checkout?cancelled=1`
    });

    // Save Stripe session ID on order
    await db.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id }
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderNumber: order.orderNumber,
      orderId: order.id
    });
  } catch (error) {
    console.error("Stripe session creation error:", error);
    return NextResponse.json(
      { error: "Unable to start checkout session. Please try again." },
      { status: 500 }
    );
  }
}
