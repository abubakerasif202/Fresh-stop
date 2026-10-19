"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRequest, errorText } from "../admin-client";
import { Badge, Notice, btnDanger, btnPrimary, inputClass } from "../ui";

const PHRASE = "ENABLE PAID CHECKOUT";

export function PaidCheckoutPanel({ enabled, reasons, dbApproved }: { enabled: boolean; reasons: string[]; dbApproved: boolean }) {
  const router = useRouter();
  const uid = useId();
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function set(next: boolean) {
    setBusy(true);
    setMessage(null);
    const result = await adminRequest("/api/admin/settings/paid-checkout", "POST", { enabled: next, confirmation: next ? phrase : undefined });
    setBusy(false);
    if (result.ok) { setPhrase(""); setMessage({ kind: "ok", text: next ? "Database approval switched on." : "Database approval switched off." }); router.refresh(); }
    else setMessage({ kind: "error", text: errorText(result) });
  }

  return (
    <section aria-labelledby={`${uid}-h`} className="mt-6 rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id={`${uid}-h`} className="font-display text-lg font-black text-forest">Paid checkout gate</h2>
        <Badge tone={enabled ? "good" : "warn"}>{enabled ? "Open" : "Closed"}</Badge>
        <Badge tone={dbApproved ? "good" : "muted"}>Database approval {dbApproved ? "on" : "off"}</Badge>
      </div>
      <p className="mb-3 text-xs text-ink-soft">
        Two keys are required: this database approval and the environment variable <code>PAID_CHECKOUT_ENABLED=true</code>, which is set outside this page.
        Stripe must also be in <strong>test mode</strong> (a live key is rejected) and at least one delivery zone must be approved.
      </p>
      {reasons.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold">Why checkout is closed:</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-ink-soft">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor={`${uid}-phrase`} className="mb-1 block text-xs font-bold">Type <code className="rounded bg-cream-deep px-1">{PHRASE}</code> to switch the database approval on</label>
          <input id={`${uid}-phrase`} className={inputClass} value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={busy || phrase !== PHRASE} onClick={() => void set(true)}>Approve paid checkout</button>
          <button type="button" className={btnDanger} disabled={busy || !dbApproved} onClick={() => void set(false)}>Switch off</button>
        </div>
      </div>
      {message && <div className="mt-3"><Notice kind={message.kind}>{message.text}</Notice></div>}
    </section>
  );
}
