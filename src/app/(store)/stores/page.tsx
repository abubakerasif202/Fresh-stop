import { db } from "@/lib/db";
import { MapPin, Phone, Mail, Clock, ExternalLink, Truck, ShoppingBag, ShieldCheck } from "lucide-react";
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
        <span className="text-xs font-bold uppercase tracking-wider text-forest bg-leaf-soft px-3 py-1 rounded-full border border-leaf">
          Store Locations
        </span>
        <h1 className="text-4xl font-display font-black text-ink mt-3 tracking-tight">Our Sydney Stores</h1>
        <p className="text-base text-ink-soft mt-2 leading-relaxed">
          Fresh Stop operates two dedicated greengrocer hubs across Southern Sydney in Rockdale and Riverwood. Visit us in-store or order online for Click &amp; Collect.
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
              id={b.slug}
              className="scroll-mt-24 bg-white border border-cream-deep rounded-[2rem] p-8 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="text-2xl font-display font-black text-ink">{b.name}</h2>
                    <p className="text-xs text-ink-soft font-medium mt-0.5">{b.suburb}, NSW</p>
                  </div>
                  <span className="text-xs font-bold text-forest bg-leaf-soft border border-leaf px-3 py-1 rounded-full">
                    Click &amp; Collect Active
                  </span>
                </div>

                <div className="space-y-4 text-sm text-ink-soft">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <strong className="block text-ink">{b.address}</strong>
                      <span>
                        {b.suburb} {b.state} {b.postcode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-forest shrink-0" aria-hidden="true" />
                    <a
                      href={`tel:${b.phone.replace(/[^0-9+]/g, "")}`}
                      className="hover:text-forest-deep text-ink-soft font-medium transition"
                    >
                      {b.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-forest shrink-0" aria-hidden="true" />
                    <a
                      href={`mailto:${b.email}`}
                      className="hover:text-forest-deep text-ink-soft font-medium transition"
                    >
                      {b.email}
                    </a>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="block font-medium text-ink">Trading Hours:</span>
                      <span className="block text-xs text-ink-soft">Mon - Sat: {hours.mon_sat}</span>
                      <span className="block text-xs text-ink-soft">Sunday: {hours.sun}</span>
                    </div>
                  </div>
                </div>

                {/* Branch Switcher & Shop Action */}
                <StoreActions slug={branchSlug} name={b.name} />
              </div>

              <div className="mt-8 pt-6 border-t border-cream-deep flex flex-wrap items-center justify-between gap-4">
                <a
                  href={b.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-forest-deep bg-leaf-soft hover:bg-leaf-soft border border-leaf px-4 py-2.5 rounded-xl transition"
                >
                  <span>Get Directions</span>
                  <span className="sr-only">(opens Google Maps in a new tab)</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fulfillment Details Banner */}
      <div className="bg-cream-deep border border-cream-deep rounded-[2rem] p-8 lg:p-10">
        <h3 className="text-xl font-display font-black text-ink mb-6">How Our 2 Stores Serve Sydney</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-cream-deep">
            <div className="w-10 h-10 rounded-xl bg-leaf-soft border border-leaf text-forest flex items-center justify-center mb-4">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="font-display font-black text-ink text-sm mb-1">Click &amp; Collect in 2 Hours</h4>
            <p className="text-xs text-ink-soft leading-relaxed">
              Order produce online and select your preferred branch (Rockdale or Riverwood). We pick and pack your fresh box ready for quick drive-up or walk-in pickup.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-cream-deep">
            <div className="w-10 h-10 rounded-xl bg-leaf-soft border border-leaf text-forest flex items-center justify-center mb-4">
              <Truck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="font-display font-black text-ink text-sm mb-1">Direct Local Delivery</h4>
            <p className="text-xs text-ink-soft leading-relaxed">
              Rockdale fulfills the St George &amp; Bayside area (2216, 2217, 2220, etc.), while Riverwood dispatches to the Canterbury-Bankstown corridor (2210, 2209, etc.). Free delivery over $150.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-cream-deep">
            <div className="w-10 h-10 rounded-xl bg-leaf-soft border border-leaf text-forest flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h4 className="font-display font-black text-ink text-sm mb-1">Fresh Produce, Local Stores</h4>
            <p className="text-xs text-ink-soft leading-relaxed">
              Fruit and vegetables are sold from our Rockdale and Riverwood stores. Questions about stock? Call the store directly.
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-cream-deep flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-ink-soft">
            Have questions about store stock or special order requests? Call our staff directly.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-forest hover:bg-forest-deep text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            Start Shopping Online
          </Link>
        </div>
      </div>
    </div>
  );
}
