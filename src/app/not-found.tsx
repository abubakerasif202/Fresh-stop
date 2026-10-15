import Link from "next/link";
import { Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <Sprout className="mx-auto h-16 w-16 text-forest" aria-hidden="true" />
      <p className="mt-5 text-sm font-bold text-forest">404 · A little off the garden path</p>
      <h1 className="mt-3 font-display text-4xl font-black">This page isn’t here.</h1>
      <p className="mt-4 text-ink-soft">Let’s get you back to the fresh produce.</p>
      <Link href="/products" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-forest px-7 font-bold text-white">Browse produce</Link>
    </section>
  );
}
