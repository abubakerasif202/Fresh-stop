"use client";

import Link from "next/link";
import { Mascot } from "@/components/motion";
import "@/styles/catalogue-motion.css";

export default function CatalogueError({ reset }: { reset: () => void }) {
  return (
    <div className="soft-pop mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mb-4 flex justify-center"><Mascot kind="banana" animation="blink" size={96} /></div>
      <h1 className="font-display text-3xl font-black text-forest">The catalogue is taking a short break</h1>
      <p role="alert" className="mt-4 text-sm leading-relaxed text-ink/75">Something did not load as expected. Please try again, or contact our team about the product you are looking for.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-12 rounded-full bg-forest px-6 font-bold text-white transition-colors hover:bg-forest-deep">Try again</button>
        <Link href="/stores" className="inline-flex min-h-12 items-center rounded-full border border-forest px-6 font-bold text-forest hover:bg-leaf-soft">Contact our team</Link>
      </div>
    </div>
  );
}
