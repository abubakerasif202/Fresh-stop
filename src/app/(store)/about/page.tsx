import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Fresh Stop",
  description: "Explore Fresh Stop's produce and grocery catalogue and speak with our team in Rockdale and Riverwood.",
  alternates: { canonical: "/about" }
};

export default function AboutPage() {
  return <div className="page-width py-12 sm:py-20">
    <p className="eyebrow text-deep-green">Meet Fresh Stop</p>
    <h1 className="section-title mt-4">Fresh produce. Everyday groceries.</h1>
    <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">Fresh Stop has stores in Rockdale and Riverwood. Our website brings together a product catalogue and direct ways to discuss products, wholesale requirements and home delivery.</p>
    <section className="mt-10 max-w-2xl rounded-2xl border border-forest/10 bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-extrabold text-forest">A conversation with our team</h2>
      <p className="mt-4 leading-relaxed text-ink-soft">Browse the range, then contact us to confirm product details, pricing and current availability. Catalogue images may be illustrative; please confirm packaging directly with our team.</p>
      <div className="mt-6 flex flex-wrap gap-4"><Link href="/products" className="button button-green">Explore the catalogue</Link><Link href="/stores" className="button button-cream">Find our stores</Link></div>
    </section>
    <p className="mt-8"><Link href="/contact" className="inline-flex min-h-11 items-center font-bold text-forest underline underline-offset-4">Contact Fresh Stop</Link></p>
  </div>;
}
