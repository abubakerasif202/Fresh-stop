"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { CartNotices } from "@/components/cart/CartNotices";
import { CheckoutFields } from "@/components/checkout/CheckoutFields";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { ClosedNotice } from "@/components/checkout/ClosedNotice";
import { useCheckout } from "@/components/checkout/useCheckout";
import { useCheckoutStatus } from "@/components/checkout/useCheckoutStatus";

function Notice({ title, body, href, cta }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center" aria-busy={!href}>
      <h1 className="font-display text-3xl font-black text-forest">{title}</h1>
      <p className="mt-3 text-sm text-ink-soft">{body}</p>
      {href && cta && <Link href={href} className="button button-green mt-6 min-h-12">{cta}</Link>}
    </div>
  );
}

export default function CheckoutPage() {
  const { items, ready, refreshCart } = useCart();
  const [availability, setAvailability] = useCheckoutStatus();
  const checkout = useCheckout(setAvailability);
  const { setField } = checkout;
  const fulfillment = checkout.form.fulfillmentType;

  useEffect(() => {
    if (ready) void refreshCart();
  }, [ready, refreshCart]);

  // If only one fulfilment type is open, select it.
  useEffect(() => {
    if (!availability) return;
    if (fulfillment === "DELIVERY" && !availability.delivery && availability.pickup) setField("fulfillmentType", "PICKUP");
    if (fulfillment === "PICKUP" && !availability.pickup && availability.delivery) setField("fulfillmentType", "DELIVERY");
  }, [availability, fulfillment, setField]);

  if (!ready || availability === null) return <Notice title="Checkout" body="Loading…" />;
  if (items.length === 0) return <Notice title="Your cart is empty" body="Add something to your cart before checking out." href="/products" cta="Browse products" />;
  if (!availability.delivery && !availability.pickup) return <ClosedNotice />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link href="/cart" className="mb-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-bold text-forest hover:underline">
          <ArrowLeft size={14} aria-hidden="true" /> Back to cart
        </Link>
        <h1 className="font-display text-3xl font-black text-forest sm:text-4xl">Checkout</h1>
        <p className="mt-1 text-sm text-ink-soft">Enter your details, then continue to Stripe to pay securely.</p>
      </div>
      <CartNotices />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void checkout.submit();
        }}
        className="grid gap-8 lg:grid-cols-12 lg:items-start"
      >
        <CheckoutFields form={checkout.form} errors={checkout.errors} delivery={checkout.delivery} availability={availability} setField={checkout.setField} />
        <CheckoutSummary form={checkout.form} delivery={checkout.delivery} submitting={checkout.submitting} message={checkout.message} conflicts={checkout.conflicts} />
      </form>
    </div>
  );
}
