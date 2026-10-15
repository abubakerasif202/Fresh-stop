import { MapPin, Phone, Clock, ExternalLink } from "lucide-react";
import { BRANCHES } from "@/lib/store/useBranchStore";

export function StoresShowcase() {
  return (
    <section className="py-16 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 px-3 py-1 rounded-full">
            Local Sydney Footprint
          </span>
          <h2 className="text-3xl font-black text-slate-900 mt-3">Visit Our Physical Stores</h2>
          <p className="text-sm text-slate-600 mt-2">
            Order online for fast, contactless Click & Collect or visit our grocers in person for the best selection of fruits and vegetables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(["rockdale", "riverwood"] as const).map((slug) => {
            const b = BRANCHES[slug];
            return (
              <div
                key={slug}
                className="bg-slate-50 border border-slate-200 rounded-3xl p-8 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-black text-slate-900">{b.name}</h3>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                    Open 7 Days
                  </span>
                </div>

                <div className="space-y-3 text-sm text-slate-600 mb-6">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800">
                      {b.address}, {b.suburb} NSW {b.postcode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-5 w-5 text-green-700 shrink-0" />
                    <a
                      href={`tel:${b.phone.replace(/[^0-9]/g, "")}`}
                      className="hover:text-green-800 transition"
                    >
                      {b.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-5 w-5 text-green-700 shrink-0" />
                    <span>{b.hours}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Click & Collect: Ready in 2 hours
                  </span>
                  <a
                    href={b.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 hover:text-green-800 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-2xs hover:shadow-xs transition"
                  >
                    Open in Maps <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
