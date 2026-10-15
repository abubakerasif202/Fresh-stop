import Link from "next/link";
import { Clock, ExternalLink, MapPin, Phone } from "lucide-react";
import { BRANCHES } from "@/lib/store/useBranchStore";
import { FREE_DELIVERY_THRESHOLD, MIN_ORDER_AMOUNT, STANDARD_DELIVERY_FEE } from "@/lib/delivery";
import { BrandLogo } from "@/components/ui/BrandLogo";

const SHOP_LINKS = [
  { label: "Fruits", href: "/products?category=fruits" },
  { label: "Vegetables", href: "/products?category=vegetables" },
  { label: "Seasonal Boxes", href: "/products?category=boxes" },
  { label: "Dairy", href: "/products?category=dairy" },
  { label: "Pantry", href: "/products?category=pantry" },
  { label: "Weekly Specials", href: "/products?special=true" },
  { label: "Find your order", href: "/orders" },
];

export function Footer() {
  const branches = [BRANCHES.rockdale, BRANCHES.riverwood];

  return (
    <footer className="border-t-8 border-lime bg-forest text-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_1.6fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-cream p-1.5">
              <BrandLogo size={48} />
            </span>
            <span className="font-display text-2xl font-bold">Fresh Stop</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/80">
            Fresh fruit, vegetables and pantry staples from our Rockdale and Riverwood stores.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-sun">Shop</h2>
          <ul className="mt-3 space-y-1">
            {SHOP_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-block py-1 text-sm text-cream/85 hover:text-sun hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-sun">Our stores</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {branches.map((b) => (
              <address key={b.slug} className="rounded-2xl bg-forest-deep p-4 text-sm not-italic">
                <p className="font-semibold">{b.name}</p>
                <p className="mt-2 flex gap-2 text-cream/85">
                  <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                  {b.address}, {b.suburb} NSW {b.postcode}
                </p>
                <p className="mt-2 flex gap-2">
                  <Phone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                  <a href={`tel:${b.phone.replace(/[^0-9]/g, "")}`} className="hover:text-sun hover:underline">
                    {b.phone}
                  </a>
                </p>
                <p className="mt-2 flex gap-2 text-cream/85">
                  <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                  {b.hours}
                </p>
                <a
                  href={b.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 font-semibold text-sun hover:underline"
                >
                  View map <ExternalLink aria-hidden className="h-3 w-3" />
                </a>
              </address>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-sun">Delivery</h2>
          <ul className="mt-3 space-y-2 text-sm text-cream/85">
            <li>2-hour Click &amp; Collect</li>
            <li>${STANDARD_DELIVERY_FEE.toFixed(2)} home delivery</li>
            <li>Free delivery from ${FREE_DELIVERY_THRESHOLD.toFixed(0)}</li>
            <li>${MIN_ORDER_AMOUNT.toFixed(0)} minimum for delivery</li>
          </ul>
          <Link href="/#shopping-questions" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-lime underline underline-offset-4">Shopping questions</Link>
        </div>
      </div>

      <div className="border-t border-cream/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-cream/70">
          <p>&copy; {new Date().getFullYear()} Fresh Stop. All rights reserved.</p>
          <Link href="/admin" className="hover:text-sun hover:underline">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
