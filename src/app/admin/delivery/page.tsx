import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { DeliveryZoneManager } from "./DeliveryZoneManager";

export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage() {
  const zones = await db.deliveryZone.findMany({
    orderBy: { name: "asc" }
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline"
          >
            <ArrowLeft size={14} /> Back to Operator Portal
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-leaf-soft p-1.5 text-forest">
              <Truck size={20} />
            </span>
            <h1 className="font-display text-3xl font-black text-forest tracking-tight sm:text-4xl">
              Sydney Delivery Zones &amp; Postcodes
            </h1>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Control Sydney delivery areas, minimum order amounts, and free shipping thresholds.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/orders" className="button button-outline text-forest text-xs">
            View Live Orders
          </Link>
        </div>
      </div>

      <DeliveryZoneManager initialZones={zones} />
    </div>
  );
}
