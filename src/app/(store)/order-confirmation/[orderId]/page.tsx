import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, MapPin, Phone, Clock, ArrowRight, Store, Truck, ShieldCheck, ShoppingBag } from "lucide-react";

interface Props {
  params: Promise<{ orderId: string }>;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { storeBranch: true }
  });

  if (!order) {
    notFound();
  }

  let items: OrderItem[] = [];
  try {
    const parsed = JSON.parse(order.itemsJson);
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = [];
  }

  const isPickup = order.fulfillmentType === "PICKUP";

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      {/* Success Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700 mb-5 shadow-xs">
          <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
        </div>

        <span className="inline-block text-xs font-bold uppercase tracking-wider text-green-800 bg-green-50 border border-green-200 px-3.5 py-1 rounded-full mb-3">
          Order Confirmed &amp; Logged
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Thank You, {order.customerName}!
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
          We have received your order <strong className="text-slate-900">#{order.orderNumber}</strong>. Our greengrocer team is preparing your fresh produce.
        </p>
      </div>

      {/* Main Order Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Order Reference</span>
            <strong className="text-base font-black text-slate-900">#{order.orderNumber}</strong>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Fulfillment</span>
            <span className="inline-flex items-center gap-1.5 font-bold uppercase text-slate-900">
              {isPickup ? (
                <>
                  <Store className="h-3.5 w-3.5 text-green-700" aria-hidden="true" />
                  <span>Click &amp; Collect</span>
                </>
              ) : (
                <>
                  <Truck className="h-3.5 w-3.5 text-green-700" aria-hidden="true" />
                  <span>Sydney Delivery</span>
                </>
              )}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Assigned Hub</span>
            <strong className="text-slate-900">{order.storeBranch.name}</strong>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Order Status</span>
            <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
              {order.orderStatus}
            </span>
          </div>
        </div>

        {/* Fulfillment Specifics Banner */}
        {isPickup ? (
          <div className="bg-green-50/70 border border-green-200/80 rounded-2xl p-5 text-xs text-green-950 space-y-2">
            <div className="flex items-center gap-1.5 font-black text-sm text-green-900">
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>Collection Instructions</span>
            </div>
            <p className="flex items-start gap-2 text-slate-700">
              <MapPin className="h-4 w-4 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>{order.storeBranch.name}:</strong> {order.storeBranch.address}, {order.storeBranch.suburb} NSW {order.storeBranch.postcode}
              </span>
            </p>
            <p className="flex items-center gap-2 text-slate-700">
              <Clock className="h-4 w-4 text-green-700 shrink-0" aria-hidden="true" />
              <span>Pickup Window: <strong>{order.pickupTimeslot || "Ready in 2 Hours"}</strong></span>
            </p>
            <p className="flex items-center gap-2 text-slate-700">
              <Phone className="h-4 w-4 text-green-700 shrink-0" aria-hidden="true" />
              <span>Branch Phone: <a href={`tel:${order.storeBranch.phone.replace(/[^0-9+]/g, "")}`} className="hover:underline font-medium">{order.storeBranch.phone}</a></span>
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 text-xs text-emerald-950 space-y-2">
            <div className="flex items-center gap-1.5 font-black text-sm text-emerald-900">
              <Truck className="h-4 w-4" aria-hidden="true" />
              <span>Delivery Instructions</span>
            </div>
            <p className="flex items-start gap-2 text-slate-700">
              <MapPin className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Destination:</strong> {order.deliveryAddress}, NSW {order.deliveryPostcode}
              </span>
            </p>
            {order.deliveryNotes && (
              <p className="text-slate-600 bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                <strong>Driver Notes:</strong> {order.deliveryNotes}
              </p>
            )}
          </div>
        )}

        {/* Itemized Order List */}
        <div>
          <h2 className="text-sm font-black text-slate-900 mb-3">Items in Your Order</h2>
          <div className="divide-y divide-slate-100 text-xs">
            {items.map((it, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 block truncate">{it.name}</span>
                  <span className="text-[11px] text-slate-500">
                    ${Number(it.price).toFixed(2)} {it.unit ? `/ ${it.unit}` : ""} × {it.quantity}
                  </span>
                </div>
                <span className="font-bold text-slate-900 shrink-0">
                  ${(Number(it.price) * Number(it.quantity)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Produce Subtotal</span>
              <span className="font-bold text-slate-900">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-bold text-slate-900">
                {order.deliveryFee === 0 ? "FREE" : `$${order.deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-black text-slate-900">
              <span>Total Amount ({order.paymentStatus === "PAID" ? "Paid" : "Due on Arrival"})</span>
              <span className="text-base text-green-700">${order.total.toFixed(2)} AUD</span>
            </div>
          </div>
        </div>

        {/* Payment Confirmation */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-700" aria-hidden="true" />
            <span className="text-slate-600">
              Payment Method: <strong>{order.paymentMethod === "STRIPE" ? "Stripe Card Payment" : "Pay on Pickup / Delivery"}</strong>
            </span>
          </div>
          <span
            className={`px-3 py-1 rounded-full font-bold text-[11px] ${
              order.paymentStatus === "PAID"
                ? "bg-green-100 text-green-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {order.paymentStatus === "PAID" ? "Payment Completed" : "Payment Pending"}
          </span>
        </div>
      </div>

      {/* Post-order Navigation */}
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-green-700 hover:bg-green-800 text-white rounded-2xl text-xs font-black shadow-xs transition"
        >
          <span>Return to Storefront</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <span>Browse More Produce</span>
        </Link>
      </div>
    </div>
  );
}
