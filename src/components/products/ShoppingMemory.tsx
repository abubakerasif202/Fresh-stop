"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

type RememberedProduct = { slug: string; name: string };
const EVENT = "fresh-stop-shopping-memory";

function read(key: string): RememberedProduct[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(data) ? data.filter((p): p is RememberedProduct => Boolean(p && typeof p === "object" && typeof p.slug === "string" && typeof p.name === "string")).slice(0, 30) : [];
  } catch { return []; }
}

function write(key: string, products: RememberedProduct[]) {
  try { localStorage.setItem(key, JSON.stringify(products)); } catch { /* Private browsing can disable persistence. Keep this session usable. */ }
  window.dispatchEvent(new Event(EVENT));
}

export function WishlistButton({ slug, name }: RememberedProduct) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => setSaved(read("fresh-stop-wishlist").some((p) => p.slug === slug));
    sync(); window.addEventListener(EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [slug]);
  return <button type="button" aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} wishlist`} onClick={() => {
    const list = read("fresh-stop-wishlist");
    write("fresh-stop-wishlist", saved ? list.filter((p) => p.slug !== slug) : [{ slug, name }, ...list].slice(0, 30));
    setSaved(!saved);
  }} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white text-forest shadow-soft transition hover:bg-leaf/20">
    <Heart aria-hidden="true" className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
  </button>;
}

export function ShoppingMemory({ viewed }: { viewed?: RememberedProduct }) {
  const [recent, setRecent] = useState<RememberedProduct[]>([]);
  const [saved, setSaved] = useState<RememberedProduct[]>([]);
  const slug = viewed?.slug;
  const name = viewed?.name;
  useEffect(() => {
    if (slug && name) write("fresh-stop-recent-products", [{ slug, name }, ...read("fresh-stop-recent-products").filter((p) => p.slug !== slug)].slice(0, 8));
    const sync = () => { setRecent(read("fresh-stop-recent-products").filter((p) => p.slug !== slug)); setSaved(read("fresh-stop-wishlist")); };
    sync(); window.addEventListener(EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [slug, name]);
  if (!recent.length && !saved.length) return null;
  return <aside className="mx-auto mt-12 max-w-7xl space-y-6 rounded-3xl bg-leaf/10 p-6" aria-label="Your shopping shortcuts">
    {[{ title: "Your wishlist", items: saved }, { title: "Recently viewed", items: recent }].map(({ title, items }) => items.length > 0 && <div key={title}>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">{items.map((p) => <div key={p.slug} className="flex max-w-full items-center gap-1 rounded-full bg-white"><Link href={`/products/${encodeURIComponent(p.slug)}`} className="min-w-0 break-words rounded-full px-4 py-3 text-sm font-semibold text-forest hover:bg-lime">{p.name}</Link>{title === "Your wishlist" && <WishlistButton slug={p.slug} name={p.name} />}</div>)}</div>
    </div>)}
    <p className="text-xs text-ink/70">Saved on this device. Open an item to check its current price and availability.</p>
  </aside>;
}
