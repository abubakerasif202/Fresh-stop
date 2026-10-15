import Link from "next/link";
import { MapPin, Phone, Clock, ShieldCheck, Truck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-lg">
              FS
            </div>
            <span className="text-xl font-black text-white">
              FRESH<span className="text-green-500">STOP</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Sydney’s dedicated farm-fresh produce and grocery destination. Family-owned, supporting Australian growers, serving Rockdale, Riverwood, and greater Sydney.
          </p>
          <div className="flex items-center gap-2 text-xs text-green-400 font-medium">
            <ShieldCheck className="h-4 w-4" /> 100% Freshness Guarantee
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Rockdale Branch</h4>
          <div className="space-y-2 text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-1" />
              Shop 1, 2-4 King Street, Rockdale NSW 2216
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-500 shrink-0" />
              <a href="tel:0295671188" className="hover:text-green-400 transition">
                (02) 9567 1188
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500 shrink-0" />
              <span>Mon–Sat 7:00am–7:30pm | Sun 8:00am–6:00pm</span>
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Riverwood Branch</h4>
          <div className="space-y-2 text-sm text-slate-400">
            <p className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-500 shrink-0 mt-1" />
              319 Belmore Rd, Riverwood NSW 2210
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-500 shrink-0" />
              <a href="tel:0295348822" className="hover:text-green-400 transition">
                (02) 9534 8822
              </a>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500 shrink-0" />
              <span>Mon–Sat 7:00am–7:30pm | Sun 8:00am–6:00pm</span>
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Sydney Home Delivery</h4>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            Delivering Monday to Saturday across St George, Canterbury-Bankstown, and greater Sydney suburbs.
          </p>
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs text-slate-300 flex items-center gap-2.5">
            <Truck className="h-5 w-5 text-amber-400 shrink-0" />
            <span>FREE home delivery on orders over $150!</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-900 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Fresh Stop Sydney. All rights reserved.
      </div>
    </footer>
  );
}
