"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { btnOutline, btnPrimary } from "./ui";

/** Native modal dialog: focus is trapped, Escape closes, and focus returns to the opener. */
export function ConfirmDialog({
  open, title, children, confirmLabel, busy, confirmDisabled, onConfirm, onCancel
}: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string; busy?: boolean; confirmDisabled?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} aria-labelledby={titleId} onClose={onCancel} className="w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 backdrop:bg-ink/50">
      <div className="space-y-4 p-5">
        <h2 id={titleId} className="font-display text-lg font-black text-forest">{title}</h2>
        <div className="text-sm text-ink">{children}</div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={btnOutline} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={onConfirm} disabled={busy || confirmDisabled}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}
