"use client";

import { useId, useState } from "react";
import { COMMERCE_STATE_LABEL } from "@/lib/commerce-state-labels";
import { adminRequest, errorText, fmt } from "../admin-client";
import { ConfirmDialog } from "../ConfirmDialog";
import { Badge, STATE_TONE, btnDanger, btnPrimary, inputClass } from "../ui";
import type { MarketRefView, PricingProduct } from "./pricing-types";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "");

function RefList({ refs }: { refs: MarketRefView[] }) {
  if (refs.length === 0) return <p className="text-xs text-ink-soft">No market references on file.</p>;
  const sorted = [...refs].sort((a, b) => Number(a.kind === "ESTIMATE") - Number(b.kind === "ESTIMATE"));
  return (
    <ul className="space-y-1.5 text-xs">
      {sorted.map((r) => r.kind === "OBSERVED" ? (
        <li key={r.id} className="rounded-lg border border-forest/20 bg-leaf/10 p-2">
          <Badge tone="good">OBSERVED</Badge>{" "}
          <strong>{r.retailer}</strong> {r.packSize} {fmt(r.priceCents)}
          <span className="block text-ink-soft">
            {r.observedAt ? `Seen ${r.observedAt}` : ""}{" "}
            {r.sourceUrl && <a className="underline" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">source</a>}
          </span>
        </li>
      ) : (
        <li key={r.id} className="rounded-lg border border-dashed border-ink/15 p-2 italic text-ink-soft opacity-70">
          <Badge tone="muted">ESTIMATE</Badge> {r.retailer} {r.packSize} about {fmt(r.priceCents)}
          <span className="block">Unverified. Not a price source.</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingRow({ product, selected, canSelect, onToggle, onChanged }: {
  product: PricingProduct; selected: boolean; canSelect: boolean; onToggle: () => void; onChanged: () => void;
}) {
  const uid = useId();
  const [price, setPrice] = useState("");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [taxMessage, setTaxMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [taxCategory, setTaxCategory] = useState<"" | "GST_FREE" | "TAXABLE_10">(
    product.taxCategoryApprovedBy?.trim() && product.taxCategoryApprovedAt ? (product.taxCategory as "GST_FREE" | "TAXABLE_10") : ""
  );
  const [taxConfirmation, setTaxConfirmation] = useState("");
  const flagged = product.review.needsReview;
  const typedCents = /^\$?\d{1,6}(\.\d{1,2})?$/.test(price.trim()) ? Math.round(Number(price.trim().replace("$", "")) * 100) : null;

  async function approve() {
    setBusy(true);
    const result = await adminRequest("/api/admin/pricing", "PATCH", {
      action: "approve", productId: product.id, price: price.trim(), confirmedName: product.name, confirmedPriceCents: typedCents,
      ...(flagged && override ? { override: { reason } } : {})
    });
    setBusy(false);
    setConfirming(false);
    if (result.ok) {
      setMessage({ kind: "ok", text: "Price approved. The product is still not purchasable until you enable it." });
      setPrice("");
      onChanged();
    } else setMessage({ kind: "error", text: errorText(result) });
  }

  async function revoke() {
    const why = window.prompt(`Reason for withdrawing the approved price of "${product.name}" (min 10 characters):`);
    if (!why) return;
    const result = await adminRequest("/api/admin/pricing", "PATCH", { action: "revoke", productId: product.id, reason: why });
    if (result.ok) onChanged();
    else setMessage({ kind: "error", text: errorText(result) });
  }

  const taxPhrase = taxCategory ? `APPROVE TAX ${product.name} ${taxCategory}` : "";
  async function approveTax(e: React.FormEvent) {
    e.preventDefault();
    if (!taxCategory || taxConfirmation !== taxPhrase) return;
    setBusy(true);
    setTaxMessage(null);
    const result = await adminRequest("/api/admin/pricing", "PATCH", {
      action: "approve_tax", productId: product.id, taxCategory, confirmedName: product.name, confirmation: taxConfirmation
    });
    setBusy(false);
    if (result.ok) {
      setTaxMessage({ kind: "ok", text: "Tax category approved and recorded. This product remains blocked until its other purchase requirements are approved." });
      setTaxConfirmation("");
      onChanged();
    } else setTaxMessage({ kind: "error", text: errorText(result) });
  }

  async function revokeTax() {
    const why = window.prompt(`Reason for withdrawing the tax approval of "${product.name}" (min 10 characters):`);
    if (!why) return;
    const result = await adminRequest("/api/admin/pricing", "PATCH", { action: "revoke_tax", productId: product.id, reason: why });
    if (result.ok) { setTaxCategory(""); setTaxMessage({ kind: "ok", text: "Tax approval withdrawn. The product cannot be purchased until it is reviewed again." }); onChanged(); }
    else setTaxMessage({ kind: "error", text: errorText(result) });
  }

  const blockedByFlag = flagged && (!override || reason.trim().length < 10);
  return (
    <li className={`rounded-2xl border bg-white p-4 shadow-soft ${selected ? "border-forest" : "border-cream-deep"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex min-h-11 min-w-11 items-center justify-center">
          <input type="checkbox" checked={selected} disabled={!selected && !canSelect} onChange={onToggle} className="h-5 w-5 accent-forest" aria-label={`Select ${product.name} for bulk approval`} />
        </label>
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-bold text-ink">{product.name}</h3>
          <p className="text-xs text-ink-soft">{product.category.name} · {product.unit ?? "no unit set"}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={STATE_TONE[product.commerceState]}>{COMMERCE_STATE_LABEL[product.commerceState]}</Badge>
            {flagged && <Badge tone="warn">Needs review</Badge>}
            {product.isPurchasable && <Badge tone="good">Purchasable</Badge>}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
          <div><dt className="text-[11px] font-bold uppercase text-ink-soft">Suggested</dt><dd className="font-bold">{fmt(product.suggestedPriceCents)}</dd></div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-ink-soft">Approved</dt>
            <dd className="font-bold">{fmt(product.approvedPriceCents)}</dd>
            {product.approvedPriceCents !== null && <dd className="text-[11px] text-ink-soft">{product.priceApprovedBy} · {when(product.priceApprovedAt)}</dd>}
          </div>
        </dl>
      </div>

      {flagged && <p className="mt-2 text-xs text-ink-soft"><strong>Review reasons:</strong> {product.review.reasons.join("; ") || "flagged"}</p>}

      <details className="mt-3">
        <summary className="min-h-8 cursor-pointer text-xs font-bold text-forest">Market references ({product.refCounts.observed} observed, {product.refCounts.estimate} estimate)</summary>
        <div className="mt-2"><RefList refs={product.refs} /></div>
      </details>

      <section className="mt-3 rounded-xl border border-cream-deep bg-cream/40 p-3" aria-labelledby={`${uid}-tax-heading`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 id={`${uid}-tax-heading`} className="text-sm font-bold">Tax treatment</h4>
          {product.taxCategoryApprovedBy?.trim() && product.taxCategoryApprovedAt
            ? <Badge tone="good">Approved: {product.taxCategory === "TAXABLE_10" ? "GST 10%" : "GST-free"}</Badge>
            : <Badge tone="warn">Owner review required · current label is unapproved</Badge>}
        </div>
        {product.taxCategoryApprovedBy?.trim() && product.taxCategoryApprovedAt && <p className="mt-1 text-xs text-ink-soft">Approved by {product.taxCategoryApprovedBy} · {when(product.taxCategoryApprovedAt)}</p>}
        <form className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,15rem)_1fr_auto] sm:items-end" onSubmit={(e) => void approveTax(e)}>
          <div>
            <label htmlFor={`${uid}-tax`} className="mb-1 block text-xs font-bold">Select the owner-confirmed category</label>
            <select id={`${uid}-tax`} className={inputClass} value={taxCategory} onChange={(e) => setTaxCategory(e.target.value as "" | "GST_FREE" | "TAXABLE_10")}>
              <option value="">Choose after review…</option>
              <option value="GST_FREE">GST-free</option>
              <option value="TAXABLE_10">GST 10% (prices include GST)</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-tax-confirm`} className="mb-1 block text-xs font-bold">Type <code className="break-all">{taxPhrase || "APPROVE TAX [product] [category]"}</code></label>
            <input id={`${uid}-tax-confirm`} className={inputClass} value={taxConfirmation} onChange={(e) => setTaxConfirmation(e.target.value)} autoComplete="off" disabled={!taxCategory} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={busy || !taxCategory || taxConfirmation !== taxPhrase || (taxCategory === product.taxCategory && Boolean(product.taxCategoryApprovedBy?.trim() && product.taxCategoryApprovedAt))}>Approve tax</button>
            {product.taxCategoryApprovedBy?.trim() && product.taxCategoryApprovedAt && <button type="button" className={btnDanger} onClick={() => void revokeTax()}>Withdraw</button>}
          </div>
        </form>
        <p className="mt-2 text-xs text-ink-soft">Confirm with the business&rsquo;s tax guidance. Existing GST-free labels are not approvals; tax approval is required before a product can be purchased.</p>
        {taxMessage && <p role={taxMessage.kind === "error" ? "alert" : "status"} className={`mt-2 text-sm font-semibold ${taxMessage.kind === "error" ? "text-berry-deep" : "text-forest"}`}>{taxMessage.text}</p>}
      </section>

      <form className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); if (typedCents) setConfirming(true); }} noValidate>
        <div>
          <label htmlFor={`${uid}-price`} className="mb-1 block text-xs font-bold">Selling price (AUD)</label>
          <input id={`${uid}-price`} inputMode="decimal" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 4.50" aria-describedby={`${uid}-hint`} />
          <p id={`${uid}-hint`} className="mt-1 text-[11px] text-ink-soft">Typed by you. Never copied from a market price.</p>
        </div>
        {flagged ? (
          <fieldset className="min-w-0 rounded-xl border border-citrus p-2">
            <legend className="px-1 text-xs font-bold">Review override</legend>
            <label className="flex min-h-9 items-center gap-2 text-xs"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="h-4 w-4 accent-forest" /> I have reviewed the flags and approve anyway</label>
            <label htmlFor={`${uid}-reason`} className="sr-only">Override reason</label>
            <input id={`${uid}-reason`} className={inputClass} disabled={!override} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (at least 10 characters)" />
          </fieldset>
        ) : <span />}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary} disabled={typedCents === null || typedCents <= 0 || blockedByFlag || !product.unit}>Approve price…</button>
          {product.approvedPriceCents !== null && <button type="button" className={btnDanger} onClick={revoke}>Withdraw approval</button>}
        </div>
      </form>
      {!product.unit && <p className="mt-1 text-xs font-semibold text-berry-deep">Set a selling unit in Products before approving a price.</p>}
      {message && <p role={message.kind === "error" ? "alert" : "status"} className={`mt-2 text-sm font-semibold ${message.kind === "error" ? "text-berry-deep" : "text-forest"}`}>{message.text}</p>}

      <ConfirmDialog open={confirming} title="Approve selling price" confirmLabel="Approve price" busy={busy} onConfirm={approve} onCancel={() => setConfirming(false)}>
        <p>Approve <strong>{product.name}</strong> at <strong>{fmt(typedCents)}</strong> per {product.unit}?</p>
        <p className="mt-2 text-xs text-ink-soft">This is recorded in the audit log under your name. It does not make the product purchasable.</p>
      </ConfirmDialog>
    </li>
  );
}
