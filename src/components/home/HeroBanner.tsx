import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/delivery";
import { HeroFloatingProduce, type HeroProduce } from "./HeroFloatingProduce";

export function HeroBanner({ produce }: { produce: HeroProduce[] }) {
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-forest text-cream">
      {/* Background organic shapes */}
      <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 h-[420px] w-[420px] rounded-full bg-forest-deep" />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -left-24 -z-10 h-[360px] w-[360px] bg-leaf/25 animate-float-slow"
        style={{ borderRadius: "58% 42% 60% 40% / 50% 55% 45% 50%" }}
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:pb-20 lg:pt-16">
        <div className="lg:col-span-7">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full bg-sun px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-ink">
            Rockdale &amp; Riverwood
          </p>

          <h1
            id="hero-heading"
            className="animate-rise mt-5 font-display text-[clamp(2.75rem,9vw,6.5rem)] font-black leading-[0.95] tracking-tight"
            style={{ animationDelay: "80ms" }}
          >
            Fresh picks,
            <span className="block text-sun">one quick stop.</span>
          </h1>

          <p
            className="animate-rise mt-6 max-w-xl text-base leading-relaxed text-cream/90 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Fruit, veg, boxes and pantry staples from our two stores. Order online for Click &amp; Collect ready in
            2 hours, or have it delivered to your door.
          </p>

          <div className="animate-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <Link
              href="/products"
              className="group inline-flex items-center gap-2 rounded-full bg-sun px-7 py-4 text-sm font-extrabold text-ink shadow-lift transition-transform hover:-translate-y-0.5 hover:bg-citrus"
            >
              Shop Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="#categories"
              className="inline-flex items-center rounded-full border-2 border-cream/60 px-7 py-[14px] text-sm font-bold text-cream transition-colors hover:bg-cream hover:text-forest"
            >
              Shop Categories
            </Link>
          </div>

          <ul
            className="animate-rise mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-cream/90"
            style={{ animationDelay: "320ms" }}
          >
            <li>Click &amp; Collect in 2 hours</li>
            <li>Free delivery over ${FREE_DELIVERY_THRESHOLD.toFixed(0)}</li>
            <li>2 local stores</li>
          </ul>
        </div>

        <div className="lg:col-span-5">
          <HeroFloatingProduce produce={produce} />
        </div>
      </div>
    </section>
  );
}
