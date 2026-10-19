import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";
import { db } from "@/lib/db";
import { PricingDashboard } from "./PricingDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } }
      },
      orderBy: [{ approvalStatus: "asc" }, { name: "asc" }]
    }),
    db.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, slug: true }
    })
  ]);

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
              <Tag size={20} />
            </span>
            <h1 className="font-display text-3xl font-black text-forest tracking-tight sm:text-4xl">
              Sydney Market Pricing &amp; Approvals
            </h1>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Research-backed grocery benchmarks across Woolworths, Coles &amp; Harris Farm.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/admin/products" className="button button-outline text-forest text-xs">
            Catalog Manager
          </Link>
        </div>
      </div>

      <PricingDashboard initialProducts={products} categories={categories} />
    </div>
  );
}
