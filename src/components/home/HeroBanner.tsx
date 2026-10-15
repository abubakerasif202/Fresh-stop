import Link from "next/link";
import { Truck, Store, ShieldCheck, Sparkles } from "lucide-react";

export function HeroBanner() {
  return (
    <div className="relative bg-gradient-to-br from-emerald-900 via-green-900 to-emerald-950 text-white py-16 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8">
          <div className="inline-flex items-center gap-2 bg-emerald-800/80 border border-emerald-700 text-emerald-200 text-xs px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Farm-fresh produce straight to your doorstep</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Sydney’s Freshest Fruit, Veg & Gourmet Groceries.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-emerald-100 max-w-2xl leading-relaxed">
            Order online from our <strong>Rockdale</strong> and <strong>Riverwood</strong> stores for rapid Click & Collect or next-day Sydney home delivery.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-6 py-3.5 rounded-xl shadow-lg transition text-sm"
            >
              Shop All Fresh Produce
            </Link>
            <Link
              href="/products?category=boxes"
              className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl backdrop-blur-xs transition text-sm"
            >
              Explore Seasonal Boxes
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-emerald-800/80">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-white">Free Delivery</span>
                <span className="text-emerald-200">On orders over $150</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-white">2 Sydney Stores</span>
                <span className="text-emerald-200">Rockdale & Riverwood</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold block text-white">Freshness Guaranteed</span>
                <span className="text-emerald-200">100% taste replacement</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
