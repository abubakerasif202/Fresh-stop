import { db } from "@/lib/db";
import { MapPin, Phone, Mail, Clock, ExternalLink, CheckCircle, Truck, ShoppingBag, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StoreActions } from "./StoreActions";

export const revalidate = 60;

export default async function StoresPage() {
  const branches = await db.storeBranch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header Banner */}
      <div className="max-w-3xl mb-12">
        <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
          Store Locations
        </span>
        <h1 className="text-4xl font-black text-slate-900 mt-3 tracking-tight">Our Sydney Stores</h1>
        <p className="text-base text-slate-600 mt-2 leading-relaxed">
          Fresh Stop operates two dedicated greengrocer hubs across Southern Sydney in Rockdale and Riverwood. Visit us in-person for daily farm-fresh market arrivals or order online for fast, contactless Click &amp; Collect.
        </p>
      </div>

      {/* Store Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {branches.map((b) => {
          let hours: { mon_sat: string; sun: string } = {
            mon_sat: "7:00 AM - 7:30 PM",
            sun: "8:00 AM - 6:00 PM"
          };
          try {
            const parsed = JSON.parse(b.openingHours);
            if (parsed && typeof parsed === "object") {
              hours = {
                mon_sat: parsed.mon_sat || hours.mon_sat,
                sun: parsed.sun || hours.sun
              };
            }
          } catch {
            // fallback default
          }

          const branchSlug = (b.slug === "riverwood" ? "riverwood" : "rockdale") as "rockdale" | "riverwood";

          return (
            <div
              key={b.id}
              className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{b.name}</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{b.suburb}, NSW</p>
                  </div>
                  <span className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                    Click &amp; Collect Active
                  </span>
                </div>

                <div className="space-y-4 text-sm text-slate-600">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <strong className="block text-slate-900">{b.address}</strong>
                      <span>
                        {b.suburb} {b.state} {b.postcode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-green-700 shrink-0" aria-hidden="true" />
                    <a
                      href={`tel:${b.phone.replace(/[^0-9+]/g, "")}`}
                      className="hover:text-green-800 text-slate-700 font-medium transition"
                    >
                      {b.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-green-700 shrink-0" aria-hidden="true" />
                    <a
                      href={`mailto:${b.email}`}
                      className="hover:text-green-800 text-slate-700 font-medium transition"
                    >
                      {b.email}
                    </a>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="block font-medium text-slate-900">Trading Hours:</span>
                      <span className="block text-xs text-slate-600">Mon - Sat: {hours.mon_sat}</span>
                      <span className="block text-xs text-slate-600">Sunday: {hours.sun}</span>
                    </div>
                  </div>
                </div>

                {/* Branch Switcher & Shop Action */}
                <StoreActions slug={branchSlug} name={b.name} />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <a
                  href={b.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2.5 rounded-xl transition"
                >
                  <span>Get Directions</span>
                  <span className="sr-only">(opens Google Maps in a new tab)</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>

                <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <span>Free Customer Parking Available</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fulfillment Details Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 lg:p-10">
        <h3 className="text-xl font-black text-slate-900 mb-6">How Our 2 Stores Serve Sydney</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80">
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mb-4">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="font-black text-slate-900 text-sm mb-1">Click &amp; Collect in 2 Hours</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Order produce online and select your preferred branch (Rockdale or Riverwood). We pick and pack your fresh box ready for quick drive-up or walk-in pickup.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80">
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mb-4">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="font-black text-slate-900 text-sm mb-1">Direct Local Delivery</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rockdale fulfills the St George &amp; Bayside area (2216, 2217, 2220, etc.), while Riverwood dispatches to the Canterbury-Bankstown corridor (2210, 2209, etc.). Free delivery over $150.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80">
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 text-green-700 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="font-black text-slate-900 text-sm mb-1">100% Quality Guaranteed</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every apple, bunch of spinach, and punnet of berries is hand-selected each morning from Sydney Flemington Markets. If anything isn&apos;t fresh, we replace or refund it immediately.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            Have questions about store stock or special order requests? Call our staff directly.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            Start Shopping Online
          </Link>
        </div>
      </div>
    </div>
  );
}
