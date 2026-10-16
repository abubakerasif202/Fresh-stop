"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-display text-4xl font-black text-forest">We couldn’t load this page.</h1>
      <p role="alert" className="mt-4 text-ink-soft">Please try again in a moment, or contact our team for product and store enquiries.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button onClick={reset} className="min-h-12 rounded-full bg-forest px-7 font-bold text-white">Try again</button>
        <Link href="/stores" className="inline-flex min-h-12 items-center rounded-full border border-forest px-7 font-bold text-forest">Contact a store</Link>
      </div>
    </section>
  );
}
