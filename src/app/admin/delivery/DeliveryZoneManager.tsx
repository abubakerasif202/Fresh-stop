"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { adminRequest, centsToDollars, dollarsToCents, errorText } from "../admin-client";
import { Badge, Notice, btnDanger, btnOutline, btnPrimary, inputClass } from "../ui";

interface Zone {
  id: string;
  name: string;
  postcodes: string;
  deliveryFeeCents: number | null;
  freeDeliveryMinCents: number | null;
  minOrderCents: number | null;
  deliveryDays: string | null;
  orderCutoffHour: number | null;
  maxDailyOrders: number | null;
  primaryBranchSlug: string;
  isActive: boolean;
  isApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
}
interface Branch { slug: string; name: string }

interface Draft {
  name: string; postcodes: string; fee: string; freeMin: string; minOrder: string;
  days: string; cutoff: string; maxDaily: string; branch: string; isActive: boolean;
}

const blank = (branch: string): Draft => ({ name: "", postcodes: "", fee: "", freeMin: "", minOrder: "", days: "", cutoff: "", maxDaily: "", branch, isActive: true });
const fromZone = (z: Zone): Draft => ({
  name: z.name, postcodes: z.postcodes, fee: centsToDollars(z.deliveryFeeCents), freeMin: centsToDollars(z.freeDeliveryMinCents),
  minOrder: centsToDollars(z.minOrderCents), days: z.deliveryDays ?? "", cutoff: z.orderCutoffHour === null ? "" : String(z.orderCutoffHour),
  maxDaily: z.maxDailyOrders === null ? "" : String(z.maxDailyOrders), branch: z.primaryBranchSlug, isActive: z.isActive
});

const optInt = (t: string) => (t.trim() === "" ? null : /^\d{1,5}$/.test(t.trim()) ? Number(t.trim()) : undefined);

function toPayload(d: Draft): { payload?: Record<string, unknown>; error?: string } {
  const fee = dollarsToCents(d.fee), free = dollarsToCents(d.freeMin), min = dollarsToCents(d.minOrder);
  const cutoff = optInt(d.cutoff), maxDaily = optInt(d.maxDaily);
  if (fee === undefined || free === undefined || min === undefined) return { error: "Money fields must be dollar amounts like 9.50, or empty." };
  if (cutoff === undefined || maxDaily === undefined) return { error: "Cut-off hour and daily limit must be whole numbers, or empty." };
  return {
    payload: {
      name: d.name, postcodes: d.postcodes, deliveryFeeCents: fee, freeDeliveryMinCents: free, minOrderCents: min,
      deliveryDays: d.days.trim() === "" ? null : d.days, orderCutoffHour: cutoff, maxDailyOrders: maxDaily, primaryBranchSlug: d.branch, isActive: d.isActive
    }
  };
}

function ZoneForm({ draft, setDraft, branches, idPrefix, fieldErrors }: {
  draft: Draft; setDraft: (d: Draft) => void; branches: Branch[]; idPrefix: string; fieldErrors: Record<string, string>;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const field = (key: keyof Draft, label: string, hint: string, errKey: string, extra?: { inputMode?: "decimal" | "numeric" }) => (
    <div>
      <label htmlFor={`${idPrefix}-${key}`} className="mb-1 block text-xs font-bold">{label}</label>
      <input id={`${idPrefix}-${key}`} className={inputClass} value={String(draft[key])} inputMode={extra?.inputMode} aria-describedby={`${idPrefix}-${key}-hint`}
        aria-invalid={Boolean(fieldErrors[errKey])} onChange={(e) => set(key, e.target.value as never)} />
      <p id={`${idPrefix}-${key}-hint`} className={`mt-1 text-[11px] ${fieldErrors[errKey] ? "font-semibold text-berry-deep" : "text-ink-soft"}`}>{fieldErrors[errKey] ?? hint}</p>
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {field("name", "Zone name", "e.g. a suburb group", "name")}
      {field("postcodes", "Postcodes", "4-digit, comma separated", "postcodes")}
      <div>
        <label htmlFor={`${idPrefix}-branch`} className="mb-1 block text-xs font-bold">Fulfilling branch</label>
        <select id={`${idPrefix}-branch`} className={inputClass} value={draft.branch} onChange={(e) => set("branch", e.target.value)}>
          {branches.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>
      {field("fee", "Delivery fee (AUD)", "Required before approval", "deliveryFeeCents", { inputMode: "decimal" })}
      {field("freeMin", "Free delivery from (AUD)", "Empty = never free", "freeDeliveryMinCents", { inputMode: "decimal" })}
      {field("minOrder", "Minimum order (AUD)", "Empty = no minimum", "minOrderCents", { inputMode: "decimal" })}
      <p className="text-sm text-amber-800">Scheduling and daily capacity enforcement are not available yet. Leave the following three fields empty to approve online delivery.</p>
      {field("days", "Delivery days", "e.g. Mon,Tue,Wed. Empty = not set", "deliveryDays")}
      {field("cutoff", "Order cut-off hour (0-23)", "Empty = not set", "orderCutoffHour", { inputMode: "numeric" })}
      {field("maxDaily", "Max orders per day", "Empty = no limit", "maxDailyOrders", { inputMode: "numeric" })}
      <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold">
        <input type="checkbox" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-forest" /> Zone is active
      </label>
    </div>
  );
}

function ZoneCard({ zone, branches, reload }: { zone: Zone; branches: Branch[]; reload: () => Promise<void> }) {
  const uid = useId();
  const [draft, setDraft] = useState<Draft>(fromZone(zone));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function run(fn: () => ReturnType<typeof adminRequest>, okText: string) {
    setBusy(true);
    setFieldErrors({});
    const result = await fn();
    setBusy(false);
    if (result.ok) {
      const reset = (result.data as { approvalReset?: boolean }).approvalReset;
      setMessage({ kind: reset ? "error" : "ok", text: reset ? "Saved. Approval was cleared because money or postcodes changed. Re-approve before checkout can use this zone." : okText });
      await reload();
    } else {
      setFieldErrors(result.data.fields ?? {});
      setMessage({ kind: "error", text: errorText(result) });
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const { payload, error } = toPayload(draft);
    if (!payload) { setMessage({ kind: "error", text: error ?? "Invalid input." }); return; }
    void run(() => adminRequest("/api/admin/delivery", "PATCH", { id: zone.id, ...payload }), "Saved.");
  }
  const remove = () => {
    if (window.confirm(`Delete the zone "${zone.name}"? This cannot be undone.`)) void run(() => adminRequest("/api/admin/delivery", "DELETE", { id: zone.id }), "Deleted.");
  };

  return (
    <li className="rounded-2xl border border-cream-deep bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-lg font-black text-forest">{zone.name}</h3>
        <Badge tone={zone.isApproved ? "good" : "warn"}>{zone.isApproved ? "Approved" : "Not approved"}</Badge>
        {!zone.isActive && <Badge tone="muted">Inactive</Badge>}
        {zone.isApproved && zone.approvedBy && <span className="text-xs text-ink-soft">by {zone.approvedBy}, {zone.approvedAt ? new Date(zone.approvedAt).toLocaleDateString("en-AU") : ""}</span>}
      </div>
      <form onSubmit={save} noValidate>
        <fieldset disabled={busy} className="min-w-0">
          <legend className="sr-only">Edit {zone.name}</legend>
          <ZoneForm draft={draft} setDraft={setDraft} branches={branches} idPrefix={uid} fieldErrors={fieldErrors} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="submit" className={btnPrimary}>Save changes</button>
            {zone.isApproved
              ? <button type="button" className={btnOutline} onClick={() => void run(() => adminRequest("/api/admin/delivery", "PATCH", { id: zone.id, action: "unapprove" }), "Approval withdrawn.")}>Withdraw approval</button>
              : <button type="button" className={btnOutline} onClick={() => void run(() => adminRequest("/api/admin/delivery", "PATCH", { id: zone.id, action: "approve" }), "Zone approved.")}>Approve zone</button>}
            <button type="button" className={btnDanger} onClick={remove}>Delete</button>
          </div>
        </fieldset>
      </form>
      {message && <div className="mt-3"><Notice kind={message.kind}>{message.text}</Notice></div>}
    </li>
  );
}

export function DeliveryZoneManager() {
  const [data, setData] = useState<{ zones: Zone[]; branches: Branch[]; hasApprovedZone: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const uid = useId();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const result = await adminRequest<{ zones: Zone[]; branches: Branch[]; hasApprovedZone: boolean }>("/api/admin/delivery", "GET");
    if (result.ok) { setData(result.data); setLoadError(null); setDraft((d) => d ?? blank(result.data.branches[0]?.slug ?? "")); }
    else setLoadError(errorText(result));
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loadError) return <Notice kind="error">{loadError}</Notice>;
  if (!data || !draft) return <p role="status" className="text-sm text-ink-soft">Loading delivery zones…</p>;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { payload, error } = toPayload(draft as Draft);
    if (!payload) { setMessage({ kind: "error", text: error ?? "Invalid input." }); return; }
    const result = await adminRequest("/api/admin/delivery", "POST", payload);
    if (result.ok) { setMessage({ kind: "ok", text: "Zone created. It is not approved yet." }); setFieldErrors({}); setDraft(blank(data?.branches[0]?.slug ?? "")); await load(); }
    else { setFieldErrors(result.data.fields ?? {}); setMessage({ kind: "error", text: errorText(result) }); }
  }

  return (
    <div className="space-y-6">
      {!data.hasApprovedZone && <Notice kind="warn">Missing configuration: no approved delivery zone exists. Paid delivery checkout stays closed until at least one zone is approved. No fees or thresholds are assumed.</Notice>}
      <details className="rounded-2xl border border-cream-deep bg-white shadow-soft">
        <summary className="min-h-11 cursor-pointer p-4 font-display text-lg font-black text-forest">Add a delivery zone</summary>
        <form onSubmit={create} className="space-y-4 p-4 pt-0" noValidate>
          <ZoneForm draft={draft} setDraft={setDraft} branches={data.branches} idPrefix={uid} fieldErrors={fieldErrors} />
          <button type="submit" className={btnPrimary}>Create zone</button>
          {message && <Notice kind={message.kind}>{message.text}</Notice>}
        </form>
      </details>
      <ul className="space-y-4">
        {data.zones.map((z) => <ZoneCard key={`${z.id}-${z.isApproved}-${z.deliveryFeeCents}-${z.postcodes}`} zone={z} branches={data.branches} reload={load} />)}
      </ul>
      {data.zones.length === 0 && <p className="text-sm text-ink-soft">No delivery zones yet.</p>}
    </div>
  );
}
