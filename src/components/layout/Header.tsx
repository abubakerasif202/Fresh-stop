import Link from "next/link";
import { Phone, Search } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { CONTACT } from "@/lib/contact";
import { MobileNav } from "./MobileNav";
import { CartButton } from "@/components/cart/CartButton";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Cart", href: "/cart" },
  { label: "Wholesale", href: "/wholesale" },
  { label: "Home Delivery", href: "/home-delivery" },
  { label: "Our Stores", href: "/stores" }
];

export function Header() {
  return (
    <header className="site-header sticky top-0 z-40 bg-cream">
      <div className="bg-forest text-white">
        <div className="page-width flex min-h-8 items-center justify-between gap-3 text-xs font-bold">
          <span className="whitespace-nowrap"><span className="min-[380px]:hidden">Online grocery shopping in Sydney</span><span className="hidden min-[380px]:inline">Fresh produce &amp; online grocery shopping in Sydney, NSW</span></span>
          <a className="hidden min-h-8 items-center whitespace-nowrap sm:inline-flex hover:underline" href={CONTACT.phoneHref}>
            {CONTACT.phoneDisplay}
          </a>
        </div>
      </div>
      <div className="page-width flex items-center gap-3 sm:gap-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandLogo size={64} eager sizes="64px" />
          <span aria-hidden="true" className="hidden font-display text-xl font-black leading-tight text-forest xl:block">
            FRESH<span className="block text-brand-red">STOP</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-5 lg:flex">
          {NAV_LINKS.filter(l => l.label !== "Cart").map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
        </nav>
        <form action="/products" role="search" className="ml-auto hidden min-w-0 max-w-52 flex-1 md:block lg:ml-3">
          <label htmlFor="header-search" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <input
              id="header-search"
              name="q"
              type="search"
              maxLength={100}
              placeholder="Find something fresh…"
              className="h-11 w-full rounded-full border border-forest/20 bg-white pl-4 pr-11 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
            />
            <button className="absolute right-0 top-0 grid h-11 w-11 place-items-center text-forest" aria-label="Search catalogue">
              <Search size={18} />
            </button>
          </div>
        </form>

        <a
          href={CONTACT.phoneHref}
          aria-label="Contact us by phone"
          className="button button-green hidden shrink-0 sm:inline-flex"
        >
          <Phone size={16} aria-hidden="true" />
          <span className="hidden xl:inline">Contact</span>
        </a>

        {/* Shopping Cart Trigger */}
        <div className="shrink-0">
          <CartButton />
        </div>

        <MobileNav links={NAV_LINKS} />
      </div>
    </header>
  );
}
