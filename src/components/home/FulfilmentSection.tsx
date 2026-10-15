import Link from "next/link";
import { ShoppingBag, Truck } from "lucide-react";
import { DeliveryFinder } from "./DeliveryFinder";
import { Reveal } from "@/components/ui/Reveal";
import {
  CANTERBURY_POSTCODES,
  FREE_DELIVERY_THRESHOLD,
  MIN_ORDER_AMOUNT,
  ST_GEORGE_POSTCODES,
  STANDARD_DELIVERY_FEE
} from "@/lib/delivery";

export function FulfilmentSection() {
  return (
    <section aria-labelledby="fulfilment-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      <Reveal>
        <h2 id="fulfilment-heading" className="font-display text-4xl font-black leading-none tracking-tight sm:text-6xl">
          Collect it, or <span className="text-citrus-deep">have it delivered</span>
        </h2>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Reveal className="h-full">
          <article className="relative h-full overflow-hidden rounded-[2.5rem] rounded-tl-[5rem] bg-sun p-7 text-ink sm:p-10">
            <div aria-hidden="true" className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-citrus/70" />
            <ShoppingBag className="relative h-10 w-10" aria-hidden="true" />
            <h3 className="relative mt-4 font-display text-3xl font-black sm:text-4xl">Click &amp; Collect</h3>
            <p className="relative mt-3 text-base font-medium leading-relaxed">
              Ready in 2 hours. Pick a timeslot and collect from Rockdale or Riverwood.
            </p>
            <Link
              href="/products"
              className="relative mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-extrabold text-cream transition-transform hover:-translate-y-0.5"
            >
              Start your order
            </Link>
          </article>
        </Reveal>

        <Reveal delay={100} className="h-full">
          <article className="relative h-full overflow-hidden rounded-[2.5rem] rounded-br-[5rem] bg-leaf p-7 text-ink sm:p-10">
            <div aria-hidden="true" className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-forest/25" />
            <Truck className="relative h-10 w-10" aria-hidden="true" />
            <h3 className="relative mt-4 font-display text-3xl font-black sm:text-4xl">Home delivery</h3>
            <p className="relative mt-3 text-base font-medium leading-relaxed">
              ${STANDARD_DELIVERY_FEE.toFixed(2)} delivery, <strong>free from ${FREE_DELIVERY_THRESHOLD.toFixed(0)}</strong>.
              ${MIN_ORDER_AMOUNT.toFixed(0)} minimum order.
            </p>
            <dl className="relative mt-5 space-y-3 text-sm">
              <div>
                <dt className="font-extrabold">St George &amp; Bayside, from Rockdale</dt>
                <dd>{ST_GEORGE_POSTCODES.join(", ")}</dd>
              </div>
              <div>
                <dt className="font-extrabold">Canterbury-Bankstown, from Riverwood</dt>
                <dd>{CANTERBURY_POSTCODES.join(", ")}</dd>
              </div>
            </dl>
          </article>
        </Reveal>
      </div>
      <DeliveryFinder />
    </section>
  );
}
