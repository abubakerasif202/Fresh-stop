"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Image from "next/image";
import { PRICE_IN_STORE_LABEL, SELLING_UNITS } from "@/lib/product-commerce";
import { COMMERCE_STATE_LABEL, type CommerceState } from "@/lib/commerce-state-labels";
import { Badge, STATE_TONE } from "../ui";
import { CommercePanel, type CommerceFields } from "./CommercePanel";

interface Category { id: string; name: string; slug: string }
interface Branch { id: string; slug: string; name: string }
interface ProductRow extends CommerceFields {
  commerceState: CommerceState;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  unit: string | null;
  imageUrl: string;
  imageAlt: string | null;
  isPublished: boolean;
  category: Category;
  inventory: { storeBranchId: string; isAvailable: boolean; storeBranch: { slug: string } }[];
}
interface Draft {
  name: string;
  categoryId: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  unit: string;
  isPublished: boolean;
  branchAvailability: Record<string, boolean>;
}
type FieldErrors = Record<string, string>;

const inputClass = "min-h-11 w-full rounded-xl border border-forest/20 bg-white px-3 text-sm focus-visible:outline-3 focus-visible:outline-citrus";

function toDraft(p: ProductRow, branches: Branch[]): Draft {
  const availability: Record<string, boolean> = {};
  for (const b of branches) availability[b.slug] = p.inventory.some((i) => i.storeBranch.slug === b.slug && i.isAvailable);
  return {
    name: p.name,
    categoryId: p.category.id,
    description: p.description ?? "",
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt ?? "",
    unit: p.unit ?? "",
    isPublished: p.isPublished,
    branchAvailability: availability
  };
}

const payload = (d: Draft) => ({
  name: d.name,
  categoryId: d.categoryId,
  description: d.description,
  imageUrl: d.imageUrl,
  imageAlt: d.imageAlt,
  unit: d.unit,
  isPublished: d.isPublished,
  branchAvailability: d.branchAvailability
});

function Field({ label, error, children, id }: { label: string; error?: string; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold text-ink">{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-berry-deep">{error}</p>}
    </div>
  );
}

function ProductEditor({
  initial, categories, branches, images, units, submitLabel, onSave, readOnly = false
}: {
  readOnly?: boolean;
  initial: Draft;
  categories: Category[];
  branches: Branch[];
  images: string[];
  units: string[];
  submitLabel: string;
  onSave: (draft: Draft) => Promise<{ ok: true } | { ok: false; error: string; fields?: FieldErrors }>;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const uid = useId();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const imageOptions = images.includes(draft.imageUrl) ? images : [draft.imageUrl, ...images];
  const unitOptions = draft.unit && !units.includes(draft.unit) ? [draft.unit, ...units] : units;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || busy) return;
    setBusy(true);
    setMessage(null);
    setFields({});
    try {
      const result = await onSave(draft);
      if (result.ok) setMessage({ kind: "ok", text: "Saved." });
      else {
        setMessage({ kind: "error", text: result.error });
        setFields(result.fields ?? {});
      }
    } catch {
      setMessage({ kind: "error", text: "Could not save. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate><fieldset disabled={readOnly || busy} className="grid min-w-0 gap-4 p-4 disabled:opacity-70 sm:grid-cols-2 lg:grid-cols-3"><legend className="sr-only">Product details</legend>
      <Field id={`${uid}-name`} label="Product name" error={fields.name}>
        <input id={`${uid}-name`} className={inputClass} value={draft.name} onChange={(e) => set("name", e.target.value)} aria-invalid={Boolean(fields.name)} aria-describedby={fields.name ? `${uid}-name-error` : undefined} />
      </Field>
      <Field id={`${uid}-cat`} label="Category" error={fields.categoryId}>
        <select id={`${uid}-cat`} className={inputClass} value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
          <option value="">Choose…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field id={`${uid}-img`} label="Image" error={fields.imageUrl}>
        <div className="flex items-center gap-2">
          <Image src={draft.imageUrl} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-ink/10" unoptimized />
          <select id={`${uid}-img`} className={inputClass} value={draft.imageUrl} onChange={(e) => set("imageUrl", e.target.value)}>
            {imageOptions.map((u) => <option key={u} value={u}>{u.replace("/products/", "")}</option>)}
          </select>
        </div>
      </Field>
      <Field id={`${uid}-unit`} label="Selling unit" error={fields.unit}>
        <select id={`${uid}-unit`} className={inputClass} value={draft.unit} onChange={(e) => set("unit", e.target.value)}>
          <option value="">Not set</option>
          {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
      <fieldset className="rounded-xl border border-forest/15 p-3">
        <legend className="px-1 text-xs font-bold">Available at</legend>
        {branches.map((b) => (
          <label key={b.slug} className="flex min-h-9 items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.branchAvailability[b.slug] ?? false} onChange={(e) => set("branchAvailability", { ...draft.branchAvailability, [b.slug]: e.target.checked })} className="h-4 w-4 accent-forest" />
            {b.name}
          </label>
        ))}
        {fields.branchAvailability && <p role="alert" className="mt-1 text-xs font-semibold text-berry-deep">{fields.branchAvailability}</p>}
      </fieldset>
      <div className="sm:col-span-2 lg:col-span-3">
        <Field id={`${uid}-desc`} label="Description (only verified information)" error={fields.description}>
          <textarea id={`${uid}-desc`} rows={2} className={`${inputClass} py-2`} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
      <Field id={`${uid}-alt`} label="Image alt text" error={fields.imageAlt}>
        <input id={`${uid}-alt`} className={inputClass} value={draft.imageAlt} onChange={(e) => set("imageAlt", e.target.value)} />
      </Field>
      <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold">
        <input type="checkbox" checked={draft.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="h-4 w-4 accent-forest" />
        Published on storefront
      </label>
      <div className="flex items-end gap-3">
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-forest px-6 text-sm font-bold text-white transition hover:bg-forest/90 disabled:opacity-60">
          {busy ? "Saving…" : submitLabel}
        </button>
        <p role="status" className={`text-sm font-semibold ${message?.kind === "error" ? "text-berry-deep" : "text-forest"}`}>{message?.text}</p>
      </div>
      {fields.isPublished && <p role="alert" className="text-xs font-semibold text-berry-deep">{fields.isPublished}</p>}
    </fieldset></form>
  );
}

export function ProductManager() {
  const [data, setData] = useState<{ products: ProductRow[]; categories: Category[]; branches: Branch[]; readOnly?: boolean } | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "unpriced">("all");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, i] = await Promise.all([fetch("/api/admin/products", { cache: "no-store" }), fetch("/api/admin/product-images", { cache: "no-store" })]);
      if (!p.ok) throw new Error(p.status === 401 ? "Please sign in to the admin portal." : "Could not load products.");
      setData(await p.json());
      if (i.ok) setImages((await i.json()).images);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load products.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function save(method: "POST" | "PATCH", url: string, d: Draft) {
    if (data?.readOnly) return { ok: false as const, error: "This preview is read-only. Live catalogue records have not been changed." };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(d)) });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      await load();
      return { ok: true as const };
    }
    return { ok: false as const, error: body.error ?? "Save failed.", fields: body.fields as FieldErrors | undefined };
  }

  if (error) return <p role="alert" className="rounded-2xl bg-berry/10 p-4 text-sm font-semibold text-berry-deep">{error}</p>;
  if (!data) return <p role="status" className="text-sm text-ink-soft">Loading products…</p>;

  const defaultImage = images.find((u) => u.includes("placeholder")) ?? "/products/placeholder-produce.webp";
  const blank: Draft = { name: "", categoryId: "", description: "", imageUrl: defaultImage, imageAlt: "", unit: "", isPublished: false, branchAvailability: {} };
  const rows = data.products.filter((p) => filter === "all" || (filter === "draft" ? !p.isPublished : p.priceCents === null));
  const units = [...SELLING_UNITS];

  return (
    <div className="space-y-6">
      {data.readOnly && <p role="status" className="rounded-2xl border border-forest/30 bg-leaf/10 p-5 font-semibold text-forest">Read-only catalogue preview. You can inspect products here; adding and editing are disabled. Live database records have not been changed.</p>}
      {!data.readOnly && <details className="rounded-2xl border border-cream-deep bg-white shadow-soft">
        <summary className="cursor-pointer p-4 font-display text-lg font-black text-forest">Add a product</summary>
        <ProductEditor key={`new-${data.products.length}`} initial={blank} categories={data.categories} branches={data.branches} images={images} units={units} submitLabel="Create draft" onSave={(d) => save("POST", "/api/admin/products", d)} />
      </details>}

      <div role="group" aria-label="Filter products" className="flex flex-wrap gap-2">
        {([["all", "All"], ["draft", "Unpublished"], ["unpriced", "No approved price"]] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${filter === key ? "bg-forest text-white" : "bg-white text-forest ring-1 ring-forest/20"}`}>{label}</button>
        ))}
        <span className="self-center text-sm text-ink-soft" aria-live="polite">{rows.length} product{rows.length === 1 ? "" : "s"}</span>
      </div>

      <ul className="space-y-3">
        {rows.map((p) => (
          <li key={p.id} className="rounded-2xl border border-cream-deep bg-white shadow-soft">
            <button type="button" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <Image src={p.imageUrl} alt="" width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{p.name}</span>
                <span className="block text-xs text-ink-soft">{p.category.name} · {p.approvalStatus === "APPROVED" && p.priceCents !== null ? `$${(p.priceCents / 100).toFixed(2)}${p.unit ? ` / ${p.unit}` : " (no unit)"}` : PRICE_IN_STORE_LABEL}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">{p.commerceState && <Badge tone={STATE_TONE[p.commerceState]}>{COMMERCE_STATE_LABEL[p.commerceState]}</Badge>}<Badge tone={p.isPublished ? "good" : "muted"}>{p.isPublished ? "Published" : "Draft"}</Badge></span>
            </button>
            {open === p.id && (
              <div className="border-t border-cream-deep">
                <ProductEditor key={`${p.id}-${p.isPublished}`} initial={toDraft(p, data.branches)} categories={data.categories} branches={data.branches} images={images} units={units} readOnly={data.readOnly} submitLabel="Save changes" onSave={(d) => save("PATCH", `/api/admin/products/${p.id}`, d)} />
                {!data.readOnly && <CommercePanel product={p} onSaved={load} />}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
