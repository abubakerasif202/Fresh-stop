import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Printer, Phone, Mail } from "lucide-react";
import { db } from "@/lib/db";
import { CONTACT } from "@/lib/contact";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const { session_id } = await searchParams;

  // Lookup order by ID or orderNumber or stripeSessionId
  let order = await db.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { orderNumber: orderId },
        { stripeSessionId: orderId },
        ...(session_id ? [{ stripeSessionId: session_id }] : [])
      ]
    },
    include: {
      storeBranch: true,
      orderItems: true
    }
  });

  if (!order) {
    notFound();
  }

  // If session_id provided and status is PENDING, verify directly with Stripe as immediate fallback
  if (order.paymentStatus === "PENDING" && session_id && stripe) {
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(session_id);
      if (stripeSession.payment_status === "paid") {
        order = await db.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            orderStatus: "PREPARING",
            stripePaymentIntentId: typeof stripeSession.payment_intent === "string" ? stripeSession.payment_intent : null
          },
          include: {
            storeBranch: true,
            orderItems: true
          }
        });
      }
    } catch (err) {
      console.warn("Could not retrieve session directly:", err);
    }
  }

  let items: Array<{
    name: string;
    unit?: string;
    quantity: number;
    priceDollars?: number;
    priceCents?: number;
    totalDollars?: number;
    totalCents?: number;
  }> = [];

  if (order.orderItems && order.orderItems.length > 0) {
    items = order.orderItems.map((i) => ({
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      priceDollars: i.priceCents / 100,
      totalDollars: i.totalCents / 100
    }));
  } else {
    try {
      items = JSON.parse(order.itemsJson || "[]");
    } catch {
      items = [];
    }
  }

  const isPaid = order.paymentStatus === "PAID";
  const isFailed = order.paymentStatus === "FAILED";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      {/* Status Hero */}
      <div className="rounded-3xl border border-forest/10 bg-white p-6 sm:p-10 text-center shadow-soft">
        {isPaid ? (
          <div>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-soft text-deep-green">
              <CheckCircle2 size={44} />
            </div>
            <p className="eyebrow mt-4 text-deep-green">Payment Successful</p>
            <h1 className="font-display text-3xl font-black text-forest sm:text-4xl mt-1">
              Thank You for Your Order!
            </h1>
            <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
              We have received your payment and our fresh produce team has begun preparing your groceries.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 font-display text-sm font-black text-forest">
              Order Number: <span className="text-brand-red">{order.orderNumber}</span>
            </div>
          </div>
        ) : isFailed ? (
          <div>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-100 text-brand-red">
              <AlertTriangle size={44} />
            </div>
            <h1 className="font-display text-3xl font-black text-forest sm:text-4xl mt-4">
              Payment Incomplete
            </h1>
            <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
              Your payment could not be processed. Please check your payment details and try again.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/checkout" className="button button-red">
                Return to Checkout
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun/30 text-amber-700">
              <Clock size={44} />
            </div>
            <h1 className="font-display text-3xl font-black text-forest sm:text-4xl mt-4">
              Processing Payment
            </h1>
            <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
              We are awaiting confirmation from the payment gateway. Please refresh this page shortly.
            </p>
            <div className="mt-4 text-xs font-bold text-forest">
              Order #{order.orderNumber}
            </div>
          </div>
        )}
      </div>

      {/* Order Details & Summary */}
      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7 space-y-6">
          {/* Purchased Items */}
          <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-black text-forest mb-4">Purchased Items</h2>
            <ul className="divide-y divide-forest/10" role="list">
              {items.map((item, idx) => (
                <li key={idx} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-extrabold text-forest">{item.name}</p>
                    <p className="text-xs text-ink-soft">
                      {item.quantity} × {item.unit || "item"}
                    </p>
                  </div>
                  <span className="font-display font-black text-forest">
                    ${(item.totalDollars || (item.totalCents ? item.totalCents / 100 : (item.priceDollars || 0) * item.quantity)).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-forest/10 pt-4 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="font-bold text-ink">${order.subtotal.toFixed(2)} AUD</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Delivery Fee</span>
                <span className="font-bold text-ink">
                  {order.deliveryFee === 0 ? "FREE" : `$${order.deliveryFee.toFixed(2)} AUD`}
                </span>
              </div>
              {order.gstTotal > 0 && (
                <div className="flex justify-between text-xs text-ink-soft">
                  <span>Included Australian GST</span>
                  <span>${order.gstTotal.toFixed(2)} AUD</span>
                </div>
              )}
              <div className="flex justify-between border-t border-forest/10 pt-2 text-base font-black text-forest">
                <span>Total Paid</span>
                <span>${order.total.toFixed(2)} AUD</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-6">
          {/* Fulfillment Info */}
          <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-black text-forest mb-3">Fulfillment Details</h2>
            <div className="space-y-3 text-sm text-ink-soft">
              <div>
                <span className="block text-xs font-bold text-forest">Customer</span>
                <p className="font-medium text-ink">{order.customerName}</p>
                <p className="text-xs">{order.customerPhone}</p>
                <p className="text-xs">{order.customerEmail}</p>
              </div>

              {order.fulfillmentType === "DELIVERY" ? (
                <div>
                  <span className="block text-xs font-bold text-forest">Delivery Address</span>
                  <p className="font-medium text-ink">
                    {order.deliveryAddress}, {order.deliverySuburb} {order.deliveryPostcode} NSW
                  </p>
                  {order.preferredDeliveryDate && (
                    <p className="text-xs text-deep-green font-bold mt-1">
                      Preferred Date: {order.preferredDeliveryDate}
                    </p>
                  )}
                  {order.deliveryNotes && (
                    <p className="text-xs italic mt-1">Note: {order.deliveryNotes}</p>
                  )}
                </div>
              ) : (
                <div>
                  <span className="block text-xs font-bold text-forest">Collection Store Hub</span>
                  <p className="font-medium text-ink">
                    {order.storeBranch?.name || "Fresh Stop Hub"}
                  </p>
                  <p className="text-xs">
                    {order.storeBranch?.address}, {order.storeBranch?.suburb}
                  </p>
                </div>
              )}

              <div>
                <span className="block text-xs font-bold text-forest">Status</span>
                <span className="inline-block rounded-full bg-leaf-soft px-2.5 py-0.5 text-xs font-black text-forest mt-1">
                  {order.orderStatus}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => typeof window !== "undefined" && window.print()}
                className="button button-outline text-forest w-full justify-center text-xs"
              >
                <Printer size={15} /> Print Tax Receipt
              </button>
              <Link href="/products" className="button button-green w-full justify-center text-xs">
                Continue Shopping <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Contact Support */}
          <div className="rounded-2xl border border-forest/10 bg-leaf-soft/40 p-5 text-xs">
            <h3 className="font-display font-extrabold text-forest text-sm mb-2">Need assistance?</h3>
            <p className="text-ink-soft leading-relaxed mb-3">
              If you need to adjust your order or delivery time, contact our Rockdale team directly:
            </p>
            <div className="space-y-1.5 font-bold text-forest">
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-deep-green" /> {CONTACT.phoneDisplay}
              </p>
              <p className="flex items-center gap-2">
                <Mail size={14} className="text-deep-green" /> {CONTACT.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
