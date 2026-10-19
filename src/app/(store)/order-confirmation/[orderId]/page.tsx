import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Phone, Mail } from "lucide-react";
import { CONTACT } from "@/lib/contact";
import { findAccessibleOrder, paymentStateOf, type AccessibleOrder, type PaymentState } from "@/lib/order-lookup";
import { getClientIp, sharedRateLimit } from "@/lib/rate-limit";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

// The access token travels in the URL: keep it out of Referer headers and search indexes.
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

const PAGE_LIMIT = { limit: 30, windowMs: 10 * 60 * 1000 };

type Props = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

interface DisplayItem {
  name: string;
  unit: string;
  quantity: number;
  totalCents: number;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const toCents = (dollars: number) => Math.round(dollars * 100);

function displayItems(order: AccessibleOrder): DisplayItem[] {
  if (order.orderItems.length > 0) {
    return order.orderItems.map((i) => ({ name: i.name, unit: i.unit, quantity: i.quantity, totalCents: i.totalCents }));
  }
  try {
    const parsed: unknown = JSON.parse(order.itemsJson || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((i: { name?: string; unit?: string; quantity?: number; totalCents?: number }) => ({
      name: i.name ?? "Item",
      unit: i.unit ?? "item",
      quantity: i.quantity ?? 1,
      totalCents: i.totalCents ?? 0
    }));
  } catch {
    return [];
  }
}

function PaidHero({ state, orderNumber, cancelled }: { state: PaymentState; orderNumber: string; cancelled: boolean }) {
  const eyebrow = state === "CONFIRMED" ? "Payment confirmed" : state === "REFUNDED" ? "Payment refunded" : "Partially refunded";
  return (
    <div>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-soft text-deep-green">
        <CheckCircle2 size={44} />
      </div>
      <p className="eyebrow mt-4 text-deep-green">{eyebrow}</p>
      <h1 className="font-display text-3xl font-black text-forest sm:text-4xl mt-1">Thank You for Your Order!</h1>
      <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
        {cancelled
          ? "We received your payment but need to check this order with you. Our team will contact you shortly."
          : "Your payment has been confirmed. Our team will prepare your order."}
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 font-display text-sm font-black text-forest">
        Order Number: <span className="text-brand-red">{orderNumber}</span>
      </div>
    </div>
  );
}

function FailedHero({ state }: { state: PaymentState }) {
  return (
    <div>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-100 text-brand-red">
        <AlertTriangle size={44} />
      </div>
      <h1 className="font-display text-3xl font-black text-forest sm:text-4xl mt-4">
        {state === "FAILED" ? "Payment failed" : "Payment session expired"}
      </h1>
      <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
        Your payment was not completed for this order. You can start checkout again.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/checkout" className="button button-red">Return to Checkout</Link>
      </div>
    </div>
  );
}

function PendingHero({ orderNumber }: { orderNumber: string }) {
  return (
    <div>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sun/30 text-amber-700">
        <Clock size={44} />
      </div>
      <h1 className="font-display text-3xl font-black text-forest sm:text-4xl mt-4">Payment pending</h1>
      <p className="mt-2 text-sm text-ink-soft max-w-md mx-auto">
        We are waiting for confirmation from the payment provider. This page shows your order&apos;s recorded status, so
        please refresh shortly. Your order is not confirmed until payment is confirmed.
      </p>
      <div className="mt-4 text-xs font-bold text-forest">Order #{orderNumber}</div>
    </div>
  );
}

function StatusHero({ state, order }: { state: PaymentState; order: AccessibleOrder }) {
  if (state === "CONFIRMED" || state === "REFUNDED" || state === "PARTIALLY_REFUNDED") {
    return <PaidHero state={state} orderNumber={order.orderNumber} cancelled={order.orderStatus === "CANCELLED"} />;
  }
  if (state === "FAILED" || state === "EXPIRED") return <FailedHero state={state} />;
  return <PendingHero orderNumber={order.orderNumber} />;
}

function Totals({ order, state }: { order: AccessibleOrder; state: PaymentState }) {
  const totalCents = order.totalCents || toCents(order.total);
  return (
    <div className="mt-4 space-y-2 border-t border-forest/10 pt-4 text-sm">
      <div className="flex justify-between text-ink-soft">
        <span>Subtotal</span>
        <span className="font-bold text-ink">{money(toCents(order.subtotal))} AUD</span>
      </div>
      <div className="flex justify-between text-ink-soft">
        <span>Delivery Fee</span>
        <span className="font-bold text-ink">
          {order.deliveryFee === 0 ? "No delivery fee" : `${money(toCents(order.deliveryFee))} AUD`}
        </span>
      </div>
      {order.gstTotal > 0 && (
        <div className="flex justify-between text-xs text-ink-soft">
          <span>Included Australian GST</span>
          <span>{money(toCents(order.gstTotal))} AUD</span>
        </div>
      )}
      <div className="flex justify-between border-t border-forest/10 pt-2 text-base font-black text-forest">
        <span>{state === "CONFIRMED" ? "Total Paid" : "Total"}</span>
        <span>{money(totalCents)} AUD</span>
      </div>
    </div>
  );
}

function FulfilmentCard({ order }: { order: AccessibleOrder }) {
  return (
    <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
      <h2 className="font-display text-lg font-black text-forest mb-3">Fulfilment Details</h2>
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
              <p className="text-xs text-deep-green font-bold mt-1">Preferred Date: {order.preferredDeliveryDate}</p>
            )}
            {order.deliveryNotes && <p className="text-xs italic mt-1">Note: {order.deliveryNotes}</p>}
          </div>
        ) : (
          <div>
            <span className="block text-xs font-bold text-forest">Collection Store Hub</span>
            <p className="font-medium text-ink">{order.storeBranch?.name || "Fresh Stop Hub"}</p>
            <p className="text-xs">{order.storeBranch?.address}, {order.storeBranch?.suburb}</p>
          </div>
        )}

        <div>
          <span className="block text-xs font-bold text-forest">Order status</span>
          <span className="inline-block rounded-full bg-leaf-soft px-2.5 py-0.5 text-xs font-black text-forest mt-1">
            {order.orderStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <PrintButton />
        <Link href="/products" className="button button-green w-full justify-center text-xs">
          Continue Shopping <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

function SupportCard() {
  return (
    <div className="rounded-2xl border border-forest/10 bg-leaf-soft/40 p-5 text-xs">
      <h3 className="font-display font-extrabold text-forest text-sm mb-2">Need assistance?</h3>
      <p className="text-ink-soft leading-relaxed mb-3">
        If you need to adjust your order or delivery time, contact our Rockdale team directly:
      </p>
      <div className="space-y-1.5 font-bold text-forest">
        <p className="flex items-center gap-2"><Phone size={14} className="text-deep-green" /> {CONTACT.phoneDisplay}</p>
        <p className="flex items-center gap-2"><Mail size={14} className="text-deep-green" /> {CONTACT.email}</p>
      </div>
    </div>
  );
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { orderId } = await params;
  const { t } = await searchParams;
  const token = Array.isArray(t) ? t[0] : t;

  // Same generic 404 for rate-limited, unknown order and wrong/missing token.
  const limit = await sharedRateLimit(`order-page:${getClientIp(await headers())}`, PAGE_LIMIT);
  if (!limit.ok) notFound();
  const order = orderId.length <= 64 ? await findAccessibleOrder(orderId, token) : null;
  if (!order) notFound();

  const items = displayItems(order);
  const state = paymentStateOf(order.paymentStatus);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-16">
      <div className="rounded-3xl border border-forest/10 bg-white p-6 sm:p-10 text-center shadow-soft">
        <StatusHero state={state} order={order} />
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7 space-y-6">
          <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg font-black text-forest mb-4">Order Items</h2>
            <ul className="divide-y divide-forest/10" role="list">
              {items.map((item, idx) => (
                <li key={idx} className="flex justify-between py-3 text-sm">
                  <div>
                    <p className="font-extrabold text-forest">{item.name}</p>
                    <p className="text-xs text-ink-soft">{item.quantity} × {item.unit}</p>
                  </div>
                  <span className="font-display font-black text-forest">{money(item.totalCents)}</span>
                </li>
              ))}
            </ul>
            <Totals order={order} state={state} />
          </div>
        </div>
        <div className="md:col-span-5 space-y-6">
          <FulfilmentCard order={order} />
          <SupportCard />
        </div>
      </div>
    </div>
  );
}
