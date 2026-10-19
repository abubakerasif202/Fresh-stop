"use client";

import { Store, Truck } from "lucide-react";
import { PICKUP_BRANCHES, type CheckoutForm, type DeliveryInfo, type FormErrors } from "@/lib/cart-checkout";
import { Field } from "./Field";
import type { Availability } from "./useCheckoutStatus";

interface Props {
  form: CheckoutForm;
  errors: FormErrors;
  delivery: DeliveryInfo;
  availability: Availability;
  setField: <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => void;
}

const CARD = "rounded-2xl border border-forest/10 bg-white p-4 shadow-soft sm:p-5";

function MethodButton({ active, onClick, icon, label, disabled = false }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm transition focus-visible:outline-3 focus-visible:outline-citrus disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-deep-green bg-leaf-soft/60 font-black text-forest" : "border-forest/20 text-ink-soft hover:bg-cream"
      }`}
    >
      {icon}
      <span>{label}</span>
      {disabled && <span className="text-[11px] font-semibold">Not available online yet</span>}
    </button>
  );
}

export function CheckoutFields({ form, errors, delivery, availability, setField }: Props) {
  const isDelivery = form.fulfillmentType === "DELIVERY";
  return (
    <div className="min-w-0 space-y-6 lg:col-span-7">
      <fieldset className={CARD}>
        <legend className="sr-only">Fulfilment method</legend>
        <h2 className="mb-4 font-display text-lg font-black text-forest">1. Delivery or pickup</h2>
        <div className="grid grid-cols-2 gap-3">
          <MethodButton active={isDelivery} onClick={() => setField("fulfillmentType", "DELIVERY")} icon={<Truck size={24} aria-hidden="true" />} label="Home delivery" disabled={!availability.delivery} />
          <MethodButton active={!isDelivery} onClick={() => setField("fulfillmentType", "PICKUP")} icon={<Store size={24} aria-hidden="true" />} label="Click & Collect" disabled={!availability.pickup} />
        </div>
        {!isDelivery && (
          <div className="mt-4 rounded-xl bg-cream p-4">
            <label htmlFor="branch" className="mb-1 block text-xs font-bold text-forest">Store for collection</label>
            <select id="branch" value={form.branch} onChange={(e) => setField("branch", e.target.value)} className="min-h-11 w-full rounded-lg border border-forest/20 bg-white p-2.5 text-base font-semibold sm:text-sm">
              {PICKUP_BRANCHES.map((b) => (
                <option key={b.slug} value={b.slug}>{b.label}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-ink-soft">Collection details are confirmed with your order.</p>
          </div>
        )}
      </fieldset>

      <section className={CARD} aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="mb-4 font-display text-lg font-black text-forest">2. Contact details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Full name" required autoComplete="name" value={form.name} onChange={(v) => setField("name", v)} error={errors.name} className="sm:col-span-2" />
          <Field id="email" label="Email address" required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(v) => setField("email", v)} error={errors.email} />
          <Field id="phone" label="Australian phone" required type="tel" autoComplete="tel" inputMode="tel" placeholder="0412 345 678" value={form.phone} onChange={(v) => setField("phone", v)} error={errors.phone} />
        </div>
      </section>

      {isDelivery && (
        <section className={CARD} aria-labelledby="address-heading">
          <h2 id="address-heading" className="mb-4 font-display text-lg font-black text-forest">3. Delivery address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="address" label="Street address" required autoComplete="street-address" value={form.address} onChange={(v) => setField("address", v)} error={errors.address} className="sm:col-span-2" />
            <Field id="suburb" label="Suburb" required autoComplete="address-level2" value={form.suburb} onChange={(v) => setField("suburb", v)} error={errors.suburb} />
            <Field id="postcode" label="Postcode" required autoComplete="postal-code" inputMode="numeric" maxLength={4} value={form.postcode} onChange={(v) => setField("postcode", v.replace(/\D/g, ""))} error={errors.postcode} />
            {delivery.checked && delivery.message && (
              <p role="status" className={`rounded-xl p-3 text-xs font-bold sm:col-span-2 ${delivery.eligible ? "border border-deep-green/20 bg-leaf-soft text-deep-green" : "border border-brand-red/20 bg-red-50 text-brand-red"}`}>
                {delivery.message}
              </p>
            )}
            <Field id="preferredDate" label="Preferred delivery date (optional)" type="date" value={form.preferredDate} onChange={(v) => setField("preferredDate", v)} error={errors.preferredDate} hint="A request only; we confirm availability." />
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-xs font-bold text-ink">Delivery notes (optional)</label>
              <textarea id="notes" name="notes" rows={2} maxLength={300} value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="w-full rounded-xl border border-forest/20 bg-white px-3.5 py-2.5 text-base focus-visible:outline-3 focus-visible:outline-citrus sm:text-sm" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
