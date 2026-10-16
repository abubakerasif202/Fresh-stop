"use client";

import Link from "next/link";

export default function CatalogueError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-3xl font-black text-forest">The catalogue is temporarily unavailable</h1><p className="mt-4 text-sm leading-relaxed text-ink/70">Please try again or contact our team about the product you are looking for.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="min-h-12 rounded-full bg-forest px-6 font-bold text-white">Try again</button><Link href="/contact" className="inline-flex min-h-12 items-center rounded-full border border-forest px-6 font-bold text-forest">Contact our team</Link></div></div>;
}
