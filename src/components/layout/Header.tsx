"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, MapPin, Menu, ShoppingBag } from "lucide-react";
import { BRANCHES, useBranchStore } from "@/lib/store/useBranchStore";
import { useCartStore } from "@/lib/store/useCartStore";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SearchBox } from "./SearchBox";
import { DeliveryPostcodeChecker } from "./DeliveryPostcodeChecker";
import { MobileNav, type NavLink } from "./MobileNav";

const NAV_LINKS: NavLink[] = [
  { label: "Fruits", href: "/products?category=fruits" },
  { label: "Vegetables", href: "/products?category=vegetables" },
  { label: "Seasonal Boxes", href: "/products?category=boxes" },
  { label: "Dairy", href: "/products?category=dairy" },
  { label: "Pantry", href: "/products?category=pantry" },
  { label: "Weekly Specials", href: "/products?special=true", highlight: true },
];

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const currentBranch = useBranchStore((s) => s.currentBranch);
  const openModal = useBranchStore((s) => s.openModal);
  const openCart = useCartStore((s) => s.openCart);
  const getTotalCount = useCartStore((s) => s.getTotalCount);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const cartCount = mounted ? getTotalCount() : 0;
  // Server and first client render both use the default branch to avoid hydration mismatch.
  const activeBranch = mounted ? currentBranch : BRANCHES.rockdale;

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-cream/90 backdrop-blur-md">
      <div className="bg-forest text-xs text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5">
          <p className="truncate">
            2-hour Click &amp; Collect <span aria-hidden className="mx-1 text-leaf">|</span>
            <span className="hidden sm:inline">Free delivery over $150</span>
            <span className="sm:hidden">Free delivery $150+</span>
          </p>
          <a
            href={`tel:${activeBranch.phone.replace(/[^0-9]/g, "")}`}
            className="shrink-0 font-semibold hover:text-sun"
          >
            {activeBranch.phone}
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Fresh Stop home">
          <BrandLogo size={44} />
          <span className="hidden font-display text-xl font-bold leading-none text-forest min-[420px]:inline">Fresh Stop</span>
        </Link>

        <SearchBox className="mx-2 hidden min-w-0 flex-1 md:block lg:max-w-md" />

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={openModal}
            aria-label={`Change store, currently ${activeBranch.name}`}
            className="inline-flex min-h-11 max-w-[8.5rem] items-center gap-1.5 rounded-full border border-forest/15 bg-white px-3 text-sm font-semibold text-forest transition hover:border-forest/40 sm:max-w-[11rem]"
          >
            <MapPin aria-hidden className="h-4 w-4 shrink-0 text-citrus-deep" />
            <span className="hidden truncate min-[420px]:inline">{activeBranch.suburb}</span>
            <ChevronDown aria-hidden className="h-3.5 w-3.5 shrink-0" />
          </button>

          <DeliveryPostcodeChecker className="hidden lg:block" />

          <button
            type="button"
            onClick={openCart}
            aria-label={cartCount > 0 ? `Shopping cart with ${cartCount} items` : "Open shopping cart"}
            className="relative inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-3 text-sm font-semibold text-white shadow-soft transition hover:bg-forest-deep sm:px-4"
          >
            <ShoppingBag aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="min-w-6 rounded-full bg-sun px-1.5 py-0.5 text-center text-xs font-bold text-ink">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-leaf-soft lg:hidden"
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav aria-label="Shop categories" className="hidden border-t border-forest/10 lg:block">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-1.5">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition hover:bg-leaf-soft ${
                  l.highlight ? "text-citrus-deep" : "text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="ml-auto">
            <Link href="/stores" className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink hover:bg-leaf-soft">
              Our Stores
            </Link>
          </li>
        </ul>
      </nav>

      <div className="border-t border-forest/10 px-4 py-2 md:hidden">
        <SearchBox />
      </div>

      <MobileNav open={menuOpen} onClose={closeMenu} links={NAV_LINKS} />
    </header>
  );
}
