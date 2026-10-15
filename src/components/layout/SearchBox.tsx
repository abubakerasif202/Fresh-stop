"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import Link from "next/link";

type Suggestion = { id: string; slug: string; name: string };
function readRecent(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem("fresh-stop-searches") ?? "[]"); return Array.isArray(value) ? value.filter((q): q is string => typeof q === "string").slice(0, 5) : []; } catch { return []; }
}
export function SearchBox({ className = "", onSubmitted }: { className?: string; onSubmitted?: () => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  useEffect(() => setRecent(readRecent()), []);
  useEffect(() => {
    setResults([]); setStatus("");
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("Searching…");
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(query.trim())}&limit=6`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid search response");
        const suggestions = data.filter((p): p is Suggestion => Boolean(p && typeof p === "object" && typeof p.id === "string" && typeof p.name === "string" && typeof p.slug === "string")).slice(0, 6);
        setResults(suggestions); setStatus(suggestions.length ? "" : "No matches. Try another fruit or vegetable.");
      } catch { if (!controller.signal.aborted) setStatus("Suggestions unavailable. Press Enter to search."); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  const remember = () => {
    const term = query.trim();
    if (term) { try { localStorage.setItem("fresh-stop-searches", JSON.stringify([term, ...readRecent().filter((s) => s !== term)].slice(0, 5))); } catch { /* Search works without local persistence. */ } }
    setOpen(false); onSubmitted?.();
  };
  return <form action="/products" method="get" role="search" onSubmit={remember} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className={`relative ${className}`}>
    <label htmlFor={id} className="sr-only">Search fresh produce</label>
    <Search aria-hidden className="pointer-events-none absolute left-3.5 top-[22px] h-4 w-4 -translate-y-1/2 text-ink-soft" />
    <input id={id} type="search" name="q" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search fruit, veg, boxes..." autoComplete="off" maxLength={100} aria-controls={open ? `${id}-suggestions` : undefined} className="h-11 w-full rounded-full border border-forest/15 bg-white pl-10 pr-4 text-sm text-ink placeholder:text-ink-soft/80 shadow-soft transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-leaf" />
    {open && (query.trim().length >= 2 || recent.length > 0) && <div id={`${id}-suggestions`} className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-forest/15 bg-white p-2 shadow-xl">
      {query.trim().length < 2 ? <><p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-ink/60">Recent searches</p>{recent.map((term) => <Link key={term} href={`/products?q=${encodeURIComponent(term)}`} onClick={() => { setOpen(false); onSubmitted?.(); }} className="block rounded-xl px-3 py-3 text-sm text-ink hover:bg-leaf/10">{term}</Link>)}</> : <>
        {results.map((p) => <Link key={p.id} href={`/products/${encodeURIComponent(p.slug)}`} onClick={remember} className="block rounded-xl px-3 py-3 text-sm font-semibold text-ink hover:bg-leaf/10">{p.name}</Link>)}
        <p role="status" className={status ? "px-3 py-2 text-sm text-ink/70" : "sr-only"}>{status || `${results.length} suggestions available. Use Tab to explore.`}</p>
        <button type="submit" className="w-full rounded-xl bg-forest px-3 py-3 text-left text-sm font-semibold text-white">See all results for “{query.trim()}”</button>
      </>}
    </div>}
  </form>;
}
