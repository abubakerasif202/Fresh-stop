"use client";

import Link from "next/link";
import { useBranchStore } from "@/lib/store/useBranchStore";
import { useCartStore } from "@/lib/store/useCartStore";
import { MapPin, ShoppingBag, Phone, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const { currentBranch, openModal } = useBranchStore();
  const { openCart, getTotalCount } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const cartCount = mounted ? getTotalCount() : 0;
  const activeBranch = mounted ? currentBranch : useBranchStore.getState().currentBranch;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Top Banner with Active Branch */}
      <div className="bg-emerald-900 text-white text-xs px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={openModal}
            className="flex items-center gap-2 hover:bg-emerald-800/80 px-2 py-1 rounded transition text-left cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              Shopping at: <strong className="font-semibold">{activeBranch.name}</strong> ({activeBranch.address})
            </span>
            <ChevronDown className="h-3 w-3 text-emerald-300" />
          </button>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-emerald-200">Next-day Delivery across Sydney</span>
            <a
              href={`tel:${activeBranch.phone.replace(/[^0-9]/g, "")}`}
              className="flex items-center gap-1 font-medium hover:text-emerald-300 transition"
            >
              <Phone className="h-3 w-3" /> {activeBranch.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-green-700 flex items-center justify-center text-white font-black text-xl shadow-xs">
            FS
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900 block leading-none">
              FRESH<span className="text-green-700">STOP</span>
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 block">
              Sydney Greengrocer
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
          <Link href="/" className="hover:text-green-700 transition">
            Home
          </Link>
          <Link href="/products" className="hover:text-green-700 transition">
            All Produce
          </Link>
          <Link href="/products?category=boxes" className="hover:text-green-700 transition">
            Seasonal Boxes
          </Link>
          <Link href="/products?special=true" className="text-amber-600 font-semibold hover:text-amber-700 transition">
            Weekly Specials
          </Link>
          <Link href="/stores" className="hover:text-green-700 transition">
            Our Stores
          </Link>
          <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-600">
            Admin
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={openCart}
            className="flex items-center gap-2.5 bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs transition cursor-pointer"
            aria-label="Open Cart Drawer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Cart</span>
            {cartCount > 0 && (
              <span className="bg-amber-400 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
