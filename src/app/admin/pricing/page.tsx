import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "lucide-react";
import { AdminHeader, btnOutline } from "../ui";
import { PricingDashboard } from "./PricingDashboard";

export const metadata: Metadata = { title: "Pricing approvals", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminPricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <AdminHeader
        title="Pricing approvals"
        icon={<Tag size={20} />}
        subtitle="Compare suggested prices with market references, then approve a selling price for each product."
        actions={<Link href="/admin/products" className={btnOutline}>Products and stock</Link>}
      />
      <PricingDashboard />
    </div>
  );
}
