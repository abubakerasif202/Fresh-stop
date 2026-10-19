import type { Metadata } from "next";
import Link from "next/link";
import { Truck } from "lucide-react";
import { AdminHeader, btnOutline } from "../ui";
import { DeliveryZoneManager } from "./DeliveryZoneManager";

export const metadata: Metadata = { title: "Delivery zones", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminDeliveryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <AdminHeader
        title="Delivery zones"
        icon={<Truck size={20} />}
        subtitle="Define where you deliver and what it costs. A zone is used at checkout only after a named admin approves it. Editing fees, thresholds or postcodes withdraws approval."
        actions={<Link href="/admin/orders" className={btnOutline}>View orders</Link>}
      />
      <DeliveryZoneManager />
    </div>
  );
}
