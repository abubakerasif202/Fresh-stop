import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sharedRateLimit, getClientIp } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/admin-route";
import { calculateTotals, parseCheckoutInput, postcodeInZone, priceToCents } from "@/lib/stripe-cart";
import { addField, stripeApi, stripeSandboxEnabled, verifySandboxAccount } from "@/lib/stripe-sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: noStore });

export async function POST(request: Request) {
  if (!stripeSandboxEnabled()) return json({ error: "Sandbox checkout is disabled." }, 404);
  if (process.env.STRIPE_PRICING_APPROVED !== "true" || process.env.STRIPE_DELIVERY_RULES_APPROVED !== "true" || process.env.STRIPE_TAX_REVIEWED !== "true") {
    return json({ error: "Checkout requires owner approval of product prices, delivery rules and tax treatment." }, 503);
  }
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  const limit = await sharedRateLimit("stripe-checkout:" + getClientIp(request.headers), { limit: 8, windowMs: 60000 });
  if (!limit.ok) return json({ error: "Checkout temporarily unavailable." }, limit.unavailable ? 503 : 429);
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > 16000) return json({ error: "Checkout request is too large." }, 413);
  let input: ReturnType<typeof parseCheckoutInput>;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 16000) return json({ error: "Checkout request is too large." }, 413);
    input = parseCheckoutInput(JSON.parse(raw));
  } catch { return json({ error: "Please check your basket and delivery details." }, 400); }

  try {
    const [products, zones] = await Promise.all([
      db.product.findMany({ where: { id: { in: input.items.map(i => i.productId) }, isPublished: true }, select: { id: true, name: true, price: true, unit: true } }),
      db.deliveryZone.findMany({ where: { isActive: true } })
    ]);
    if (products.length !== input.items.length) return json({ error: "Some products are unavailable." }, 409);
    const zone = zones.find(z => postcodeInZone(z.postcodes, input.deliveryPostcode));
    if (!zone) return json({ error: "Home delivery is not offered for this postcode." }, 422);
    const branch = await db.storeBranch.findFirst({ where: { slug: zone.primaryBranchSlug, isActive: true }, select: { id: true } });
    if (!branch) return json({ error: "Delivery is currently unavailable." }, 409);
    const availability = await db.branchInventory.findMany({ where: {
      storeBranchId: branch.id, productId: { in: input.items.map(i => i.productId) }, isAvailable: true
    }, select: { productId: true } });
    if (availability.length !== input.items.length) return json({ error: "Some items are not available from the dispatch branch." }, 409);
    const productMap = new Map(products.map(p => [p.id, p]));
    const lines = input.items.map(item => {
      const p = productMap.get(item.productId);
      if (!p || !p.unit || !p.unit.trim()) throw new Error("Unpriced or unverified product.");
      const unitCents = priceToCents(p.price);
      if (!unitCents) throw new Error("Unpriced or unverified product.");
      return { ...item, name: p.name + " / " + p.unit, unitCents };
    });
    const minSpend = priceToCents(zone.minOrderAmount);
    const freeSpend = priceToCents(zone.freeDeliveryMinSpend);
    const fee = zone.deliveryFee === 0 ? 0 : priceToCents(zone.deliveryFee);
    if (minSpend == null || freeSpend == null || fee == null) throw new Error("Invalid delivery price configuration.");
    const subtotal = calculateTotals(lines, 0).subtotalCents;
    if (subtotal < minSpend) return json({ error: "Order does not meet the delivery-zone minimum." }, 422);
    const deliveryFeeCents = subtotal >= freeSpend ? 0 : fee;
    const totals = calculateTotals(lines, deliveryFeeCents);

    // Store pending order first; never treat a browser success redirect as proof of payment.
    const order = await db.order.create({ data: {
      orderNumber: "FS-" + randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase(),
      fulfillmentType: "DELIVERY", storeBranchId: branch.id,
      customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone,
      deliveryAddress: input.deliveryAddress, deliveryPostcode: input.deliveryPostcode,
      itemsJson: JSON.stringify(lines.map(l => ({ id: l.productId, name: l.name, quantity: l.quantity, price: l.unitCents / 100 }))),
      subtotal: totals.subtotalCents / 100, deliveryFee: deliveryFeeCents / 100, total: totals.totalCents / 100,
      paymentMethod: "STRIPE", paymentStatus: "PENDING", orderStatus: "AWAITING_PAYMENT"
    } });
    try {
      await verifySandboxAccount();
      const origin = process.env.STRIPE_CHECKOUT_RETURN_ORIGIN;
      if (!origin) throw new Error("Missing checkout return origin.");
      const returnUrl = new URL(origin);
      if (returnUrl.origin !== origin.replace(/\/$/, "") ||
          !(returnUrl.protocol === "https:" || (returnUrl.protocol === "http:" && returnUrl.hostname === "localhost"))) {
        throw new Error("Invalid checkout return origin.");
      }
      const form = new URLSearchParams();
      addField(form, "mode", "payment");
      addField(form, "currency", "aud");
      addField(form, "client_reference_id", order.id);
      addField(form, "customer_email", input.customerEmail);
      addField(form, "metadata[order_id]", order.id);
      addField(form, "payment_intent_data[metadata][order_id]", order.id);
      addField(form, "success_url", returnUrl.origin + "/shop/success?session_id={CHECKOUT_SESSION_ID}");
      addField(form, "cancel_url", returnUrl.origin + "/shop?cancelled=1");
      lines.forEach((line, i) => {
        addField(form, "line_items[" + i + "][price_data][currency]", "aud");
        addField(form, "line_items[" + i + "][price_data][unit_amount]", line.unitCents);
        addField(form, "line_items[" + i + "][price_data][product_data][name]", line.name);
        addField(form, "line_items[" + i + "][quantity]", line.quantity);
      });
      if (deliveryFeeCents > 0) {
        const n = lines.length;
        addField(form, "line_items[" + n + "][price_data][currency]", "aud");
        addField(form, "line_items[" + n + "][price_data][unit_amount]", deliveryFeeCents);
        addField(form, "line_items[" + n + "][price_data][product_data][name]", "Fresh Stop home delivery");
        addField(form, "line_items[" + n + "][quantity]", 1);
      }
      const session = await stripeApi("POST", "/checkout/sessions", form, "freshstop-checkout-" + order.id);
      if (typeof session.id !== "string" || typeof session.url !== "string" || !session.url.startsWith("https://checkout.stripe.com/")) throw new Error("Stripe checkout response was invalid.");
      await db.order.update({ where: { id: order.id }, data: { stripeCheckoutSessionId: session.id } });
      return json({ url: session.url }, 200);
    } catch {
      await db.order.update({ where: { id: order.id }, data: { paymentStatus: "ERROR" } }).catch(() => {});
      return json({ error: "Unable to start secure checkout. Please try again." }, 502);
    }
  } catch {
    return json({ error: "Checkout cannot be completed. Please contact Fresh Stop." }, 503);
  }
}
