"use client";

import Image from "next/image";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { conflictReason, type CheckoutForm, type Conflict, type DeliveryInfo } from "@/lib/cart-checkout";
import { formatCents } from "@/lib/cart-core";
import { ESTIMATE_LABEL } from "@/components/cart/CartSummary";

interface Props {
  form: CheckoutForm;
  delivery: DeliveryInfo;
  submitting: boolean;
  message: string | null;
  conflicts: Conflict[];
}

function deliveryLine(form: CheckoutForm, delivery: DeliveryInfo): { text: string; cents: number } {
  if (form.fulfillmentType === "PICKUP") return { text: "Free", cents: 0 };
  if (delivery.checked && delivery.eligible && delivery.feeCents !== null) {
    return { text: delivery.feeCents === 0 ? "Free" : formatCents(delivery.feeCents), cents: delivery.feeCents };
  }
  return { text: "Confirmed at checkout", cents: 0 };
}

export function CheckoutSummary({ form, delivery, submitting, message, conflicts }: Props) {
  const { items, estimatedSubtotalCents, statuses } = useCart();
  const fee = deliveryLine(form, delivery);
  const names = new Map(items.map((l) => [l.productId, l.name]));
  const isDelivery = form.fulfillmentType === "DELIVERY";
  const belowMin = isDelivery && delivery.minOrderCents !== null && estimatedSubtotalCents < delivery.minOrderCents;
  const blocked = Object.values(statuses).some((s) => s.kind === "unavailable");

  return (
    <div className="lg:col-span-5">
      <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft sm:p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-black text-forest">Order summary</h2>
        <ul className="mt-4 max-h-60 divide-y divide-forest/10 overflow-y-auto pr-1 text-sm">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-forest/10 bg-cream">
                  <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-forest sm:text-sm">{item.name}</p>
                  <p className="text-[11px] text-ink-soft">{item.quantity} × {formatCents(item.priceCents)} / {item.unit}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-bold text-forest sm:text-sm">{formatCents(item.priceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-2.5 border-t border-forest/10 pt-4 text-sm">
          <div className="flex justify-between text-ink-soft"><span>Items</span><span className="font-bold text-ink">{formatCents(estimatedSubtotalCents)}</span></div>
          <div className="flex justify-between gap-3 text-ink-soft"><span>Delivery</span><span className="text-right font-bold text-ink">{fee.text}</span></div>
          <div className="flex items-baseline justify-between gap-3 border-t border-forest/10 pt-3 font-black text-forest">
            <span className="text-sm leading-snug">{ESTIMATE_LABEL}</span>
            <span className="font-display text-xl">{formatCents(estimatedSubtotalCents + fee.cents)}</span>
          </div>
          {isDelivery && delivery.freeDeliveryMinCents !== null && (
            <p className="text-[11px] text-ink-soft">Free delivery on orders of {formatCents(delivery.freeDeliveryMinCents)} or more in your area.</p>
          )}
          {belowMin && delivery.minOrderCents !== null && (
            <p role="status" className="rounded-lg bg-sun/25 p-2 text-xs font-bold text-amber-900">Minimum delivery order for your area is {formatCents(delivery.minOrderCents)}.</p>
          )}
        </div>

        {message && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-brand-red/20 bg-red-50 p-3 text-xs font-bold text-brand-red">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p>{message}</p>
              {conflicts.length > 0 && (
                <ul className="mt-1.5 list-disc pl-4 font-semibold">
                  {conflicts.map((c) => (
                    <li key={c.productId}>{names.get(c.productId) ?? "An item"}: {conflictReason(c.reason)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-ink-soft">All amounts are AUD and include applicable GST.</p>
        <p className="mt-4 rounded-lg bg-leaf-soft p-3 text-xs leading-relaxed text-forest">
          Orders may include items sourced after purchase. We will contact you if availability affects fulfilment.
        </p>

        <button type="submit" disabled={submitting || blocked} aria-busy={submitting} className="button button-red mt-5 min-h-12 w-full justify-center text-center text-base shadow-soft disabled:cursor-not-allowed disabled:opacity-70">
          {submitting ? (
            <span>Connecting to secure payment…</span>
          ) : (
            <span className="inline-flex items-center gap-2"><Lock size={17} aria-hidden="true" /> Continue to secure payment</span>
          )}
        </button>
        {blocked && <p className="mt-2 text-xs font-bold text-brand-red">Remove unavailable items from your cart to continue.</p>}
        <p className="mt-4 flex items-start justify-center gap-1.5 text-center text-xs font-semibold text-deep-green">
          <ShieldCheck size={16} className="mt-px shrink-0" aria-hidden="true" /> Payment is taken on Stripe&apos;s secure page. The final amount is shown there before you pay.
        </p>
      </div>
    </div>
  );
}
