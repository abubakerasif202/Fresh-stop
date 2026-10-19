import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { priceToCents } from "@/lib/stripe-cart";
import { stripeSandboxEnabled } from "@/lib/stripe-sandbox";
import { ShopClient } from "@/components/stripe/ShopClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sandbox shop — Fresh Stop", robots: { index: false, follow: false } };
export default async function ShopPage() {
  if (!stripeSandboxEnabled()) notFound();
  const products = await db.product.findMany({
    where: { isPublished: true, price: { not: null }, unit: { not: null } },
    select: { id: true, name: true, price: true, unit: true, imageUrl: true, inventory: { select: { isAvailable: true } } },
    orderBy: { name: "asc" }, take: 200
  });
  const catalog = products.flatMap(p => {
    const cents = priceToCents(p.price);
    if (cents == null || !p.unit?.trim() || !p.inventory.some(i => i.isAvailable)) return [];
    return [{ id: p.id, name: p.name, unit: p.unit, priceCents: cents, imageUrl: p.imageUrl }];
  });
  return <main className="page-width py-10 sm:py-14">
    <p className="eyebrow text-deep-green">Fresh Stop development preview</p>
    <h1 className="section-title mt-3">Sandbox grocery shop</h1>
    <p className="mt-4 max-w-3xl leading-relaxed text-ink-soft">Test checkout only. No live payments are enabled. Only products with reviewed prices, selling units and marked inventory appear. Availability and delivery charges are rechecked on the server.</p>
    <ShopClient products={catalog} />
  </main>;
}
