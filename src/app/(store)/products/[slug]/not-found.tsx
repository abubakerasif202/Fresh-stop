import Link from "next/link";

export default function ProductNotFound() {
  return <div className="mx-auto max-w-xl px-4 py-20 text-center"><p className="text-xs font-bold uppercase tracking-widest text-forest">Fresh Stop catalogue</p><h1 className="mt-4 font-display text-4xl font-black text-forest">Product not found</h1><p className="mt-4 text-sm leading-relaxed text-ink/70">This product is not currently listed in our catalogue. Browse our categories or contact our team for help.</p><Link href="/products" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-forest px-6 font-bold text-white">Explore the catalogue</Link></div>;
}
