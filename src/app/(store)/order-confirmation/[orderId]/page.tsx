import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
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
  const isPaid = order.paymentStatus === "PAID";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      {/* Success Hero */}
      <div className="text-center mb-10 motion-safe:animate-rise">
        <div className="flex justify-center mb-5">
          <BrandLogo size={64} priority />
        </div>
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-leaf-soft text-forest mb-5 shadow-soft motion-safe:animate-pop">
          <CheckCircle2 className="h-12 w-12" aria-hidden="true" />
        </div>

        <p className="inline-block text-xs font-bold uppercase tracking-wider text-forest-deep bg-leaf-soft px-3.5 py-1 rounded-full mb-3">
          Order received
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-black text-forest tracking-tight">
          Thank you, {order.customerName}!
        </h1>
        <p className="text-sm text-ink-soft mt-2 max-w-lg mx-auto">
          We have received your order <strong className="text-ink">#{order.orderNumber}</strong>. Our greengrocer
          team is preparing your fresh produce.
        </p>
      </div>

      {/* Receipt */}
      <div className="bg-white border border-forest/10 rounded-3xl shadow-lift overflow-hidden">
        {/* Status strip */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 sm:p-6 bg-cream-deep text-sm">
          <div>
            <dt className="text-ink-soft text-xs mb-0.5">Order reference</dt>
            <dd className="font-black text-ink">#{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-ink-soft text-xs mb-0.5">Fulfillment</dt>
            <dd className="inline-flex items-center gap-1.5 font-bold text-ink">
              {isPickup ? (
                <>
                  <Store className="h-4 w-4 text-forest" aria-hidden="true" />
                  <span>Click &amp; Collect</span>
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 text-forest" aria-hidden="true" />
                  <span>Sydney Delivery</span>
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft text-xs mb-0.5">Assigned hub</dt>
            <dd className="font-bold text-ink">{order.storeBranch.name}</dd>
          </div>
          <div>
            <dt className="text-ink-soft text-xs mb-0.5">Order status</dt>
            <dd>
              <span className="inline-block bg-sun text-ink px-2.5 py-0.5 rounded-full text-xs font-black">
                {order.orderStatus}
              </span>
            </dd>
          </div>
        </dl>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Fulfilment instructions */}
          {isPickup ? (
            <section aria-labelledby="fulfil-heading" className="bg-leaf-soft/70 border border-leaf rounded-2xl p-5 text-sm text-ink space-y-2.5">
              <h2 id="fulfil-heading" className="flex items-center gap-2 font-display font-black text-lg text-forest">
                <Store className="h-5 w-5" aria-hidden="true" />
                <span>Collection instructions</span>
              </h2>
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>{order.storeBranch.name}:</strong> {order.storeBranch.address}, {order.storeBranch.suburb}{" "}
                  NSW {order.storeBranch.postcode}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-forest shrink-0" aria-hidden="true" />
                <span>
                  Pickup window: <strong>{order.pickupTimeslot || "Ready in 2 hours"}</strong>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-forest shrink-0" aria-hidden="true" />
                <span>
                  Branch phone:{" "}
                  <a
                    href={`tel:${order.storeBranch.phone.replace(/[^0-9+]/g, "")}`}
                    className="underline font-semibold focus-visible:outline-3 focus-visible:outline-citrus"
                  >
                    {order.storeBranch.phone}
                  </a>
                </span>
              </p>
              <p className="text-xs text-ink-soft pt-1">
                Bring your order number #{order.orderNumber} when you collect.
              </p>
            </section>
          ) : (
            <section aria-labelledby="fulfil-heading" className="bg-leaf-soft/70 border border-leaf rounded-2xl p-5 text-sm text-ink space-y-2.5">
              <h2 id="fulfil-heading" className="flex items-center gap-2 font-display font-black text-lg text-forest">
                <Truck className="h-5 w-5" aria-hidden="true" />
                <span>Delivery details</span>
              </h2>
              <p className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Destination:</strong> {order.deliveryAddress}, NSW {order.deliveryPostcode}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Store className="h-4 w-4 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Dispatched from <strong>{order.storeBranch.name}</strong>. Questions? Call{" "}
                  <a
                    href={`tel:${order.storeBranch.phone.replace(/[^0-9+]/g, "")}`}
                    className="underline font-semibold focus-visible:outline-3 focus-visible:outline-citrus"
                  >
                    {order.storeBranch.phone}
                  </a>
                  .
                </span>
              </p>
              {order.deliveryNotes && (
                <p className="bg-white/80 p-3 rounded-xl border border-leaf/60">
                  <strong>Driver notes:</strong> {order.deliveryNotes}
                </p>
              )}
            </section>
          )}

          {/* Items */}
          <section aria-labelledby="items-heading">
            <h2 id="items-heading" className="font-display text-lg font-black text-forest mb-3">
              Items in your order
            </h2>
            <ul className="divide-y divide-forest/10 text-sm">
              {items.map((it, idx) => (
                <li key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-bold text-ink block">{it.name}</span>
                    <span className="text-xs text-ink-soft">
                      ${Number(it.price).toFixed(2)} {it.unit ? `/ ${it.unit}` : ""} × {it.quantity}
                    </span>
                  </div>
                  <span className="font-bold text-ink shrink-0 tabular-nums">
                    ${(Number(it.price) * Number(it.quantity)).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 pt-4 border-t border-dashed border-forest/30 space-y-2 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>Produce subtotal</span>
                <span className="font-bold text-ink tabular-nums">${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span className="font-bold text-ink tabular-nums">
                  {order.deliveryFee === 0 ? "FREE" : `$${order.deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-forest/10 text-base font-black text-forest">
                <span>Total ({isPaid ? "Paid" : "Due on arrival"})</span>
                <span className="text-lg tabular-nums">${order.total.toFixed(2)} AUD</span>
              </div>
            </div>
          </section>

          {/* Payment */}
          <div className="pt-4 border-t border-forest/10 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-forest" aria-hidden="true" />
              <span className="text-ink-soft">
                Payment method:{" "}
                <strong className="text-ink">
                  {order.paymentMethod === "STRIPE" ? "Card" : "Pay on pickup / delivery"}
                </strong>
              </span>
            </div>
            <span
              className={`px-3 py-1 rounded-full font-bold text-xs ${
                isPaid ? "bg-leaf-soft text-forest-deep" : "bg-sun text-ink"
              }`}
            >
              {isPaid ? "Payment completed" : "Payment pending"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-citrus hover:bg-citrus-deep hover:text-white text-ink rounded-full text-sm font-black shadow-soft transition focus-visible:outline-3 focus-visible:outline-forest"
        >
          <span>Return to storefront</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-white border border-forest/20 hover:bg-leaf-soft text-forest rounded-full text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-citrus"
        >
          <ShoppingBag className="h-4 w-4" aria-hidden="true" />
          <span>Browse more produce</span>
        </Link>
      </div>
    </div>
  );
}
