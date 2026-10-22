"use client";

import { useId, useState } from "react";
import { adminRequest, errorText } from "../admin-client";
import { Notice, btnPrimary, inputClass } from "../ui";

export const AVAILABILITY = ["IN_STOCK", "BACKORDER", "OUT_OF_STOCK", "UNKNOWN", "ENQUIRY_ONLY", "DISCONTINUED"] as const;

export interface CommerceFields {
  id: string;
  name: string;
  approvalStatus: string;
  priceCents: number | null;
  priceApprovedBy: string | null;
  stockQuantity: number | null;
  stockVerified: boolean;
  reservedQuantity: number;
  maxOrderQuantity: number | null;
  availabilityStatus: string;
  isPurchasable: boolean;
  compareAtApproved: boolean;
  compareAtPriceCents: number | null;
  purchasableBlockers: string[];
}

const toInt = (text: string): number | null | undefined => {
  if (text.trim() === "") return null;
  return /^\d{1,7}$/.test(text.trim()) ? Number(text.trim()) : undefined;
};

/** Stock, availability and purchasable controls. Prices are approved on the pricing page only. */
export function CommercePanel({ product, onSaved }: { product: CommerceFields; onSaved: () => Promise<void> | void }) {
  const uid = useId();
  const [stock, setStock] = useState(product.stockQuantity === null ? "" : String(product.stockQuantity));
  const [verified, setVerified] = useState(product.stockVerified);
  const [maxQty, setMaxQty] = useState(product.maxOrderQuantity === null ? "" : String(product.maxOrderQuantity));
  const [availability, setAvailability] = useState(product.availabilityStatus);
  const [purchasable, setPurchasable] = useState(product.isPurchasable);
  const [compareAt, setCompareAt] = useState(product.compareAtApproved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const stockQuantity = toInt(stock);
    const maxOrderQuantity = toInt(maxQty);
    if (stockQuantity === undefined || maxOrderQuantity === undefined) {
      setMessage({ kind: "error", text: "Stock and maximum order quantity must be whole numbers, or empty." });
      return;
    }
    setBusy(true);
    const result = await adminRequest(`/api/admin/products/${product.id}/commerce`, "PATCH", {
      stockQuantity, stockVerified: verified, maxOrderQuantity, availabilityStatus: availability, isPurchasable: purchasable, compareAtApproved: compareAt
    });
    setBusy(false);
    if (result.ok) {
      const auto = (result.data as { autoDisabledBecause?: string[] }).autoDisabledBecause ?? [];
      setMessage({ kind: auto.length ? "error" : "ok", text: auto.length ? `Saved, but purchasable was switched off: ${auto.join(" ")}` : "Saved." });
      await onSaved();
    } else setMessage({ kind: "error", text: errorText(result) });
  }

  const approved = product.approvalStatus === "APPROVED" && product.priceCents !== null;
  return (
    <form onSubmit={save} className="border-t border-cream-deep p-4" noValidate>
      <fieldset disabled={busy} className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="mb-2 font-display text-base font-black text-forest">Stock, availability and purchasing</legend>
        <div>
          <label htmlFor={`${uid}-stock`} className="mb-1 block text-xs font-bold">Stock quantity (empty = unknown)</label>
          <input id={`${uid}-stock`} inputMode="numeric" className={inputClass} value={stock} onChange={(e) => setStock(e.target.value)} />
          <label className="mt-1 flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-4 w-4 accent-forest" />
            I counted this stock and it is verified
          </label>
          <p className="text-[11px] text-ink-soft">Changing the number clears verification unless you tick it again.</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold">Reserved by open orders</p>
          <p className="flex min-h-11 items-center rounded-xl bg-cream-deep px-3 text-sm" aria-label="Reserved quantity (read only)">{product.reservedQuantity}</p>
          <label htmlFor={`${uid}-max`} className="mb-1 mt-2 block text-xs font-bold">Max per order (empty = no limit)</label>
          <input id={`${uid}-max`} inputMode="numeric" className={inputClass} value={maxQty} onChange={(e) => setMaxQty(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${uid}-avail`} className="mb-1 block text-xs font-bold">Availability status</label>
          <select id={`${uid}-avail`} className={inputClass} value={availability} onChange={(e) => setAvailability(e.target.value)}>
            {AVAILABILITY.map((a) => <option key={a} value={a}>{a === "BACKORDER" ? "available to order / backorders accepted" : a.replace(/_/g, " ").toLowerCase()}</option>)}
          </select>
          <label className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={purchasable} onChange={(e) => setPurchasable(e.target.checked)} className="h-4 w-4 accent-forest" />
            Purchasable online
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={compareAt} onChange={(e) => setCompareAt(e.target.checked)} className="h-4 w-4 accent-forest" disabled={product.compareAtPriceCents === null} />
            Show approved compare-at price
          </label>
        </div>
      </fieldset>
      <div className="mt-3 space-y-2">
        {!approved && <Notice kind="warn">No approved price. Approve one on the Pricing page before enabling purchase.</Notice>}
        {approved && product.purchasableBlockers.length > 0 && <Notice kind="warn">Cannot be purchasable yet: {product.purchasableBlockers.join(" ")}</Notice>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={btnPrimary} disabled={busy}>{busy ? "Saving…" : "Save stock settings"}</button>
          {message && <p role={message.kind === "error" ? "alert" : "status"} className={`text-sm font-semibold ${message.kind === "error" ? "text-berry-deep" : "text-forest"}`}>{message.text}</p>}
        </div>
      </div>
    </form>
  );
}
