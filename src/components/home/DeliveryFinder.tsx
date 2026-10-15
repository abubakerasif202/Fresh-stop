"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import { checkDeliveryEligibility } from "@/lib/delivery";
import { BRANCHES } from "@/lib/store/useBranchStore";

export function DeliveryFinder() {
  const id = useId();
  const [postcode, setPostcode] = useState("");
  const [checkedPostcode, setCheckedPostcode] = useState<string | null>(null);
  const result = checkedPostcode ? checkDeliveryEligibility(checkedPostcode, 0) : null;
  function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckedPostcode(postcode.trim());
  }
  return (
    <div className="mt-8 rounded-3xl border border-forest/20 bg-cream p-5 sm:p-7">
      <div className="flex items-center gap-2"><MapPin aria-hidden="true" className="h-5 w-5 text-forest" /><h3 className="font-display text-2xl font-bold">Fresh to your postcode?</h3></div>
      <p className="mt-2 text-sm text-ink-soft">Check your delivery area before you fill your basket.</p>
      <form onSubmit={check} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="mb-1.5 block text-xs font-bold">Delivery postcode</label>
          <input id={id} required pattern="[0-9]{4}" inputMode="numeric" autoComplete="postal-code" maxLength={4} placeholder="e.g. 2216" value={postcode} onChange={(event) => { setPostcode(event.target.value.replace(/\D/g, "")); setCheckedPostcode(null); }} className="h-12 w-full min-w-0 rounded-xl border border-forest/25 bg-white px-4 text-base" />
        </div>
        <button type="submit" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-forest px-5 text-sm font-extrabold text-cream transition-colors hover:bg-forest-deep">Check <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {result && <p className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm leading-relaxed ${result.eligible ? "bg-leaf-soft text-forest-deep" : "bg-sun/30 text-ink"}`}><CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{result.assignedBranch ? `We deliver to ${checkedPostcode} from ${BRANCHES[result.assignedBranch].name}. ${result.message}` : result.message}</p>}
      </div>
    </div>
  );
}
