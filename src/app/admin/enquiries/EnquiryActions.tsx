"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminRequest, errorText } from "../admin-client";
import { btnOutline, btnPrimary } from "../ui";

interface Props {
  enquiryId: string;
  status: "NEW" | "CONTACTED" | "CLOSED";
  emailSent: boolean;
}

/** Status buttons and email retry for one enquiry. Server enforces auth, origin and audit. */
export function EnquiryActions({ enquiryId, status, emailSent }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run(body: Record<string, unknown>, success: (data: Record<string, unknown>) => string) {
    setBusy(true);
    setMessage("");
    const result = await adminRequest("/api/admin/enquiries", "PATCH", { enquiryId, ...body });
    setBusy(false);
    if (!result.ok) {
      setMessage(errorText(result));
      return;
    }
    setMessage(success(result.data));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status !== "CONTACTED" && (
          <button type="button" disabled={busy} className={btnPrimary} onClick={() => run({ status: "CONTACTED" }, () => "Marked contacted.")}>Mark contacted</button>
        )}
        {status !== "CLOSED" && (
          <button type="button" disabled={busy} className={btnOutline} onClick={() => run({ status: "CLOSED" }, () => "Closed.")}>Close</button>
        )}
        {status !== "NEW" && (
          <button type="button" disabled={busy} className={btnOutline} onClick={() => run({ status: "NEW" }, () => "Reopened.")}>Reopen</button>
        )}
        {!emailSent && (
          <button
            type="button"
            disabled={busy}
            className={btnOutline}
            onClick={() => run({ action: "resend_email" }, (d) => (d.emailed ? "Owner email sent." : `Email not sent (${String(d.reason ?? "unknown")}).`))}
          >
            Retry owner email
          </button>
        )}
      </div>
      <p className="min-h-5 text-xs text-ink-soft" role="status" aria-live="polite">{message}</p>
    </div>
  );
}
