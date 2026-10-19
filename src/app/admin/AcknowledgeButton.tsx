"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRequest, errorText } from "./admin-client";
import { ConfirmDialog } from "./ConfirmDialog";
import { btnPrimary, inputClass } from "./ui";

export function AcknowledgeButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    const result = await adminRequest("/api/admin/orders", "PATCH", { orderId, action: "acknowledge_payment", reason });
    setBusy(false);
    if (result.ok) { setOpen(false); setReason(""); router.refresh(); } else setError(errorText(result));
  }

  return (
    <>
      <button type="button" className={btnPrimary} onClick={() => { setError(null); setOpen(true); }}>Acknowledge</button>
      <ConfirmDialog open={open} title="Acknowledge payment review" confirmLabel="Acknowledge" busy={busy} confirmDisabled={reason.trim().length < 10} onConfirm={() => void submit()} onCancel={() => setOpen(false)}>
        <label htmlFor={`${uid}-r`} className="mb-1 block text-xs font-bold">What did you check or resolve? (10+ characters)</label>
        <input id={`${uid}-r`} className={inputClass} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        <p className="mt-2 text-xs text-ink-soft">This records your note only. Payment status is not changed.</p>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-berry-deep">{error}</p>}
      </ConfirmDialog>
    </>
  );
}
