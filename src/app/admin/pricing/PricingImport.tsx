"use client";

import { useState } from "react";
import { adminRequest, errorText, fmt } from "../admin-client";
import { Notice, btnOutline, btnPrimary, inputClass } from "../ui";

interface Preview { slug: string; name: string; unit: string | null; priceCents: number; previousPriceCents: number | null }

export function PricingImport({ onSaved }: { onSaved: () => void }) {
  const [csv, setCsv] = useState("");
  const [items, setItems] = useState<Preview[]>([]);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit(save: boolean) {
    setBusy(true); setError(null); setMessage(null);
    const result = await adminRequest<{ items: Preview[] }>("/api/admin/pricing/import", "POST", { csv, ...(save ? { confirmation: phrase } : {}) });
    setBusy(false);
    if (!result.ok) { setError(errorText(result)); return; }
    if (save) { setItems([]); setPhrase(""); setMessage("Draft prices saved. Review and approve selling prices separately."); onSaved(); }
    else { setItems(result.data.items); setPhrase(""); }
  }
  return <details className="rounded-2xl border border-cream-deep bg-white p-4">
    <summary className="cursor-pointer font-bold text-forest">Bulk edit draft prices with CSV</summary>
    <p className="my-3 text-sm text-ink-soft">Export the catalogue, edit the Suggested Price AUD column in your spreadsheet, then upload it here. Preview every row before saving. This updates draft prices only; it does not approve prices, change stock or enable payment.</p>
    <label htmlFor="pricing-csv" className="mb-1 block text-xs font-bold">Pricing CSV (maximum 200 KB, 200 products)</label>
    <input id="pricing-csv" className={inputClass} type="file" accept=".csv,text/csv" disabled={busy} onChange={async (e) => {
      setCsv(""); setItems([]); setError(null); setMessage(null);
      const file = e.target.files?.[0]; if (!file) return;
      if (file.size > 200_000) { setError("Choose a CSV file smaller than 200 KB."); return; }
      try { setCsv(await file.text()); } catch { setError("Could not read this file. Choose it again."); }
    }} />
    <button type="button" className={`${btnOutline} mt-3`} disabled={busy || !csv} onClick={() => void submit(false)}>{busy ? "Working…" : "Preview CSV changes"}</button>
    {items.length > 0 && <div className="mt-3 space-y-3">
      <ul className="max-h-72 overflow-auto text-sm">{items.map((item) => <li key={item.slug} className="flex flex-wrap justify-between gap-2 border-b border-cream-deep py-2"><span>{item.name} ({item.unit ?? "unit unset"})</span><span>{fmt(item.previousPriceCents)} → <strong>{fmt(item.priceCents)}</strong></span></li>)}</ul>
      <label htmlFor="import-confirm" className="block text-xs font-bold">Type SAVE {items.length} DRAFT PRICES to confirm</label>
      <input id="import-confirm" className={inputClass} autoComplete="off" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
      <button type="button" className={btnPrimary} disabled={busy || phrase !== `SAVE ${items.length} DRAFT PRICES`} onClick={() => void submit(true)}>Save draft prices</button>
    </div>}
    {error && <div className="mt-3"><Notice kind="error">{error}</Notice></div>}
    {message && <div className="mt-3"><Notice kind="ok">{message}</Notice></div>}
  </details>;
}
