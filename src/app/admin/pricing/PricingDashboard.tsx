"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { MAX_BULK_APPROVE, bulkConfirmationPhrase } from "@/lib/commerce-state-labels";
import { adminRequest, errorText, fmt } from "../admin-client";
import { Notice, btnOutline, btnPrimary, inputClass } from "../ui";
import { PricingRow } from "./PricingRow";
import { PricingImport } from "./PricingImport";
import type { PricingProduct } from "./pricing-types";

type Filter = "all" | "needs-approval" | "needs-tax-approval" | "suggested" | "needs-review" | "approved";
const PAGE = 40;

const matches = (p: PricingProduct, filter: Filter) => {
  if (filter === "needs-approval") return p.approvedPriceCents === null;
  if (filter === "needs-tax-approval") return !p.taxCategoryApprovedBy?.trim() || !p.taxCategoryApprovedAt;
  if (filter === "suggested") return p.approvedPriceCents === null && p.suggestedPriceCents !== null;
  if (filter === "needs-review") return p.review.needsReview;
  if (filter === "approved") return p.approvedPriceCents !== null;
  return true;
};

function BulkPanel({ items, onDone, onClear }: { items: PricingProduct[]; onDone: () => void; onClear: () => void }) {
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expected = bulkConfirmationPhrase(items.length);
  const problems = items.filter((p) => p.suggestedPriceCents === null || p.review.needsReview || !p.unit);

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await adminRequest("/api/admin/pricing", "PATCH", {
      action: "approve_selected", confirmation: phrase,
      items: items.map((p) => ({ productId: p.id, priceCents: p.suggestedPriceCents }))
    });
    setBusy(false);
    if (result.ok) { onDone(); setPhrase(""); } else setError(errorText(result));
  }

  return (
    <section aria-labelledby="bulk-heading" className="rounded-2xl border-2 border-forest bg-white p-4 shadow-soft">
      <h2 id="bulk-heading" className="font-display text-lg font-black text-forest">Approve {items.length} selected at suggested price</h2>
      <p className="mt-1 text-xs text-ink-soft">Review every line. Products stay not purchasable until you enable each one separately. Limit: {MAX_BULK_APPROVE} at a time.</p>
      <ul className="mt-3 divide-y divide-cream-deep text-sm">
        {items.map((p) => (
          <li key={p.id} className="flex flex-wrap justify-between gap-2 py-1.5">
            <span className="min-w-0 break-words">{p.name} <span className="text-ink-soft">({p.unit ?? "no unit"})</span></span>
            <strong>{fmt(p.suggestedPriceCents)}</strong>
          </li>
        ))}
      </ul>
      {problems.length > 0 && <div className="mt-2"><Notice kind="warn">{problems.length} selected item(s) cannot be bulk approved (no suggestion, no unit, or flagged for review). Approve those individually or deselect them.</Notice></div>}
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="bulk-phrase" className="mb-1 block text-xs font-bold">Type <code className="rounded bg-cream-deep px-1">{expected}</code> to confirm</label>
          <input id="bulk-phrase" className={inputClass} value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
        </div>
        <button type="button" className={btnPrimary} disabled={busy || phrase !== expected || problems.length > 0} onClick={submit}>{busy ? "Approving…" : "Approve selected"}</button>
        <button type="button" className={btnOutline} onClick={onClear}>Clear selection</button>
      </div>
      {error && <div className="mt-2"><Notice kind="error">{error}</Notice></div>}
    </section>
  );
}

export function PricingDashboard() {
  const [products, setProducts] = useState<PricingProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [filter, setFilter] = useState<Filter>("needs-approval");
  const [selected, setSelected] = useState<string[]>([]);
  const [shown, setShown] = useState(PAGE);

  const load = useCallback(async () => {
    const result = await adminRequest<{ products: PricingProduct[] }>("/api/admin/pricing", "GET");
    if (result.ok) { setProducts(result.data.products); setLoadError(null); }
    else setLoadError(errorText(result));
  }, []);
  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(() => [...new Map((products ?? []).map((p) => [p.category.slug, p.category.name])).entries()], [products]);
  const filtered = useMemo(() => (products ?? []).filter((p) =>
    matches(p, filter) && (category === "all" || p.category.slug === category) &&
    (!search || `${p.name} ${p.slug}`.toLowerCase().includes(search.toLowerCase()))), [products, filter, category, search]);
  const selectedItems = (products ?? []).filter((p) => selected.includes(p.id));

  if (loadError) return <Notice kind="error">{loadError}</Notice>;
  if (!products) return <p role="status" className="text-sm text-ink-soft">Loading pricing data…</p>;

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < MAX_BULK_APPROVE ? [...s, id] : s));
  const counts = {
    approved: products.filter((p) => p.approvedPriceCents !== null).length,
    pending: products.filter((p) => p.approvedPriceCents === null).length,
    taxReview: products.filter((p) => !p.taxCategoryApprovedBy?.trim() || !p.taxCategoryApprovedAt).length
  };

  return (
    <div className="space-y-5">
      <Notice kind="warn">Indicative and suggested prices are drafts. OBSERVED references have a dated source; ESTIMATE references are unverified. A named admin must explicitly approve selling prices before paid checkout is possible.</Notice>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" aria-live="polite">
        <span><strong>{counts.approved}</strong> approved</span>
        <span><strong>{counts.pending}</strong> awaiting approval</span>
        <span><strong>{counts.taxReview}</strong> tax reviews needed</span>
        <a href="/api/admin/pricing/export" className={`${btnOutline} gap-1.5`}><Download size={16} aria-hidden="true" /> Export CSV</a>
      </div>

      <PricingImport onSaved={() => void load()} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="pricing-search" className="mb-1 block text-xs font-bold">Search products</label>
          <input id="pricing-search" type="search" className={inputClass} value={search} onChange={(e) => { setSearch(e.target.value); setShown(PAGE); }} />
        </div>
        <div>
          <label htmlFor="pricing-category" className="mb-1 block text-xs font-bold">Category</label>
          <select id="pricing-category" className={inputClass} value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE); }}>
            <option value="all">All categories</option>
            {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pricing-filter" className="mb-1 block text-xs font-bold">Show</label>
          <select id="pricing-filter" className={inputClass} value={filter} onChange={(e) => { setFilter(e.target.value as Filter); setShown(PAGE); }}>
            <option value="all">All products</option>
            <option value="needs-approval">Awaiting approval</option>
            <option value="needs-tax-approval">Needs tax review</option>
            <option value="suggested">Has suggested price</option>
            <option value="needs-review">Flagged for review</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {selectedItems.length > 0 && <BulkPanel items={selectedItems} onClear={() => setSelected([])} onDone={() => { setSelected([]); void load(); }} />}
      <p className="text-xs text-ink-soft" aria-live="polite">{filtered.length} product{filtered.length === 1 ? "" : "s"}. Select up to {MAX_BULK_APPROVE} for optional bulk approval at the suggested price.</p>

      <ul className="space-y-3">
        {filtered.slice(0, shown).map((p) => (
          <PricingRow key={p.id} product={p} selected={selected.includes(p.id)} canSelect={selected.length < MAX_BULK_APPROVE} onToggle={() => toggle(p.id)} onChanged={() => void load()} />
        ))}
      </ul>
      {filtered.length > shown && <button type="button" className={btnOutline} onClick={() => setShown((n) => n + PAGE)}>Show more ({filtered.length - shown} remaining)</button>}
    </div>
  );
}
