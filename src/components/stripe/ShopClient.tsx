"use client";

import { useState } from "react";
import Image from "next/image";

export interface ShopProduct { id: string; name: string; unit: string; imageUrl: string; priceCents: number }
const money = (cents: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);

export function ShopClient({ products }: { products: ShopProduct[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const update = (id: string, delta: number) => setCart(prev => {
    const next = { ...prev }, count = Math.min(20, Math.max(0, (next[id] ?? 0) + delta));
    if (count) next[id] = count; else delete next[id];
    return next;
  });
  const chosen = products.filter(p => cart[p.id] > 0);
  const subtotal = chosen.reduce((sum, p) => sum + p.priceCents * cart[p.id], 0);
  async function checkout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen.length || pending) return;
    setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, items: chosen.map(p => ({ productId: p.id, quantity: cart[p.id] })) })
      });
      const body: { url?: string; error?: string } = await response.json();
      if (!response.ok || !body.url || !body.url.startsWith("https://checkout.stripe.com/")) throw new Error(body.error || "Unable to open Stripe Checkout.");
      window.location.assign(body.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Checkout unavailable."); setPending(false); }
  }
  return <div className="mt-9 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
    <section aria-labelledby="shop-products">
      <h2 id="shop-products" className="text-2xl font-black text-forest">Available test products</h2>
      {!products.length && <p className="mt-4 rounded-xl bg-white p-5 text-ink-soft">No products have verified prices and available inventory in this database. Ask the owner to review prices and branch availability before testing checkout.</p>}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {products.map(p => <article key={p.id} className="overflow-hidden rounded-xl border border-forest/10 bg-white">
          <div className="relative aspect-square bg-cream"><Image src={p.imageUrl} alt={p.name} fill sizes="(max-width: 640px) 50vw, 200px" className="object-cover" /></div>
          <div className="space-y-2 p-3">
            <h3 className="text-sm font-bold text-forest">{p.name}</h3>
            <p className="text-sm font-semibold text-ink">{money(p.priceCents)} / {p.unit}</p>
            <div className="flex items-center justify-between gap-1">
              <button type="button" className="min-h-11 min-w-11 rounded-full border border-forest/30" onClick={() => update(p.id, -1)} aria-label={"Remove one " + p.name}>−</button>
              <span aria-live="polite" className="font-bold tabular-nums">{cart[p.id] ?? 0}</span>
              <button type="button" className="min-h-11 min-w-11 rounded-full bg-forest text-white" onClick={() => update(p.id, 1)} aria-label={"Add one " + p.name}>+</button>
            </div>
          </div>
        </article>)}
      </div>
    </section>
    <aside className="self-start rounded-2xl border border-forest/10 bg-white p-5 shadow-soft lg:sticky lg:top-32">
      <h2 className="text-xl font-black text-forest">Your test basket</h2>
      {chosen.length ? <ul className="mt-4 space-y-2 text-sm">{chosen.map(p => <li key={p.id} className="flex justify-between gap-2"><span>{p.name} × {cart[p.id]}</span><strong>{money(p.priceCents * cart[p.id])}</strong></li>)}</ul> : <p className="mt-3 text-sm text-ink-soft">Add items to begin.</p>}
      <div className="mt-4 border-t border-forest/10 pt-4"><p className="flex justify-between font-black"><span>Subtotal</span><span>{money(subtotal)}</span></p><p className="mt-2 text-xs text-ink-soft">Delivery charges and any applicable order minimum are confirmed by the server. Prices are for sandbox testing only.</p></div>
      <form className="mt-5 space-y-3" onSubmit={checkout}>
        <label className="block text-sm font-semibold">Full name<input required name="customerName" maxLength={120} autoComplete="name" className="mt-1 w-full rounded-lg border border-forest/20 p-3" /></label>
        <label className="block text-sm font-semibold">Email<input required type="email" name="customerEmail" maxLength={254} autoComplete="email" className="mt-1 w-full rounded-lg border border-forest/20 p-3" /></label>
        <label className="block text-sm font-semibold">Phone<input required type="tel" name="customerPhone" maxLength={30} autoComplete="tel" className="mt-1 w-full rounded-lg border border-forest/20 p-3" /></label>
        <label className="block text-sm font-semibold">Delivery street address<input required name="deliveryAddress" maxLength={250} autoComplete="street-address" className="mt-1 w-full rounded-lg border border-forest/20 p-3" /></label>
        <label className="block text-sm font-semibold">NSW delivery postcode<input required name="deliveryPostcode" pattern="[0-9]{4}" maxLength={4} inputMode="numeric" autoComplete="postal-code" className="mt-1 w-full rounded-lg border border-forest/20 p-3" /></label>
        {error && <p role="alert" className="rounded-lg bg-cream-deep p-3 text-sm text-brand-red">{error}</p>}
        <button type="submit" disabled={!chosen.length || pending} className="button button-green w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Starting Stripe test Checkout…" : "Continue to Stripe test Checkout"}</button>
      </form>
    </aside>
  </div>;
}
