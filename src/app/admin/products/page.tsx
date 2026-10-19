import type { Metadata } from "next";
import Link from "next/link";
import { ProductManager } from "./ProductManager";

export const metadata: Metadata = { title: "Product management", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <header className="mb-6">
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-forest">
          <Link href="/admin" className="underline underline-offset-4">Operator portal</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink">Products</span>
        </nav>
        <h1 className="font-display text-3xl font-black tracking-tight text-forest sm:text-4xl">Product management</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">
          Manage catalogue details and publication, and set stock, availability and purchasing per product. Prices are approved on the Pricing page.
          A product is sold online only when its price is approved, its stock is verified and you switch it to purchasable. Catalogue review Previews are read-only.
        </p>
      </header>
      <ProductManager />
    </div>
  );
}
