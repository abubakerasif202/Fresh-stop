import Link from "next/link";
import type { CSSProperties } from "react";
import { Mascot } from "@/components/motion";
import "@/styles/catalogue-motion.css";

const link = "inline-flex min-h-12 items-center rounded-full px-7 font-bold transition-colors";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-5 py-16 text-center sm:py-20">
      <div className="lost-row" aria-hidden="true">
        <span style={{ "--i": 0 } as CSSProperties}><Mascot kind="strawberry" animation="bounce" size="clamp(44px, 13vw, 72px)" /></span>
        <span className="lost-num" style={{ "--i": 1 } as CSSProperties}>4</span>
        <span style={{ "--i": 2 } as CSSProperties}><Mascot kind="orange" animation="roll" size="clamp(48px, 15vw, 84px)" /></span>
        <span className="lost-num" style={{ "--i": 3 } as CSSProperties}>4</span>
        <span style={{ "--i": 4 } as CSSProperties}><Mascot kind="banana" animation="dance" size="clamp(44px, 13vw, 72px)" /></span>
      </div>
      <span className="lost-trail" aria-hidden="true" />
      <p className="mt-5 text-sm font-bold text-forest">404 · A little off the garden path</p>
      <h1 className="mt-3 font-display text-4xl font-black text-forest">This page has wandered off.</h1>
      <p className="mt-4 text-ink-soft">Our fruit went looking for it too. Let’s get you back to the fresh produce.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className={`${link} bg-forest text-white hover:bg-forest-deep`}>Back home</Link>
        <Link href="/products" className={`${link} border border-forest text-forest hover:bg-leaf-soft`}>Browse produce</Link>
        <Link href="/stores" className={`${link} border border-forest text-forest hover:bg-leaf-soft`}>Contact us</Link>
      </div>
    </section>
  );
}
