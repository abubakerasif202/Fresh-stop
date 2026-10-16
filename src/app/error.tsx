"use client";

import Link from "next/link";
import { Mascot } from "@/components/motion";
import "@/styles/catalogue-motion.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="soft-pop mx-auto max-w-xl px-5 py-20 text-center">
      <div className="mb-4 flex justify-center"><Mascot kind="carrot" animation="blink" size={96} /></div>
      <h1 className="font-display text-4xl font-black text-forest">We couldn’t load this page.</h1>
      <p role="alert" className="mt-4 text-ink-soft">That one is on us. Please try again in a moment, or contact our team for product and store enquiries.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="min-h-12 rounded-full bg-forest px-7 font-bold text-white transition-colors hover:bg-forest-deep">Try again</button>
        <Link href="/stores" className="inline-flex min-h-12 items-center rounded-full border border-forest px-7 font-bold text-forest hover:bg-leaf-soft">Contact a store</Link>
      </div>
    </section>
  );
}
