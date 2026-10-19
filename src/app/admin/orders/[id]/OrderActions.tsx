"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminRequest, errorText } from "../../admin-client";
import { ConfirmDialog } from "../../ConfirmDialog";
import { Notice, btnDanger, btnOutline, btnPrimary, cardClass } from "../../ui";

const LABEL: Record<string, string> = {
  PREPARING: "Start preparing", READY: "Mark ready", OUT_FOR_DELIVERY: "Send out for delivery", DELIVERED: "Mark delivered / collected"
};

export function OrderActions({ orderId, orderNumber, status, paymentStatus, next }: {
  orderId: string; orderNumber: string; status: string; paymentStatus: string; next: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error" | "warn"; text: string } | null>(null);
  const advance = next.filter((s) => s !== "CANCELLED");
  const canCancel = next.includes("CANCELLED");

  async function call(body: Record<string, unknown>, okText: string) {
    setBusy(true);
    setMessage(null);
    const result = await adminRequest("/api/admin/orders", "PATCH", { orderId, ...body });
    setBusy(false);
    setConfirmCancel(false);
    if (!result.ok) { setMessage({ kind: "error", text: errorText(result) }); return; }
    const refund = (result.data as { refundRequired?: boolean }).refundRequired;
    setMessage({ kind: refund ? "warn" : "ok", text: refund ? "Order cancelled. It was already paid: issue the refund in the Stripe dashboard. Stock is not restored automatically." : okText });
    router.refresh();
  }

  async function resend() {
    setBusy(true);
    setMessage(null);
    const result = await adminRequest<{ emails?: { customer: { sent: boolean; reason?: string }; business: { sent: boolean; reason?: string } } }>("/api/admin/orders", "PATCH", { orderId, action: "resend_emails" });
    setBusy(false);
    if (!result.ok) { setMessage({ kind: "error", text: errorText(result) }); return; }
    const e = result.data.emails;
    const part = (n: string, s?: { sent: boolean; reason?: string }) => `${n}: ${s?.sent ? "sent" : `not sent (${s?.reason ?? "unknown"})`}`;
    setMessage({ kind: e?.customer.sent && e.business.sent ? "ok" : "warn", text: `${part("Customer", e?.customer)}. ${part("Business", e?.business)}.` });
  }

  return (
    <section aria-labelledby="actions" className={`${cardClass} mt-5 p-4`}>
      <h2 id="actions" className="mb-2 font-display text-lg font-black text-forest">Actions</h2>
      {status === "PENDING_PAYMENT" && <p className="mb-3 text-sm text-ink-soft">Waiting for Stripe to confirm payment. This order cannot enter fulfilment until it is paid.</p>}
      <div className="flex flex-wrap gap-2">
        {advance.map((s) => <button key={s} type="button" className={btnPrimary} disabled={busy} onClick={() => void call({ action: "status", orderStatus: s }, `Order moved to ${s.replace(/_/g, " ").toLowerCase()}.`)}>{LABEL[s] ?? s}</button>)}
        {paymentStatus === "PAID" && <button type="button" className={btnOutline} disabled={busy} onClick={() => void resend()}>Re-send confirmation emails</button>}
        {canCancel && <button type="button" className={btnDanger} disabled={busy} onClick={() => setConfirmCancel(true)}>Cancel order</button>}
        {advance.length === 0 && !canCancel && paymentStatus !== "PAID" && <p className="text-sm text-ink-soft">No actions available for this order.</p>}
      </div>
      {message && <div className="mt-3"><Notice kind={message.kind}>{message.text}</Notice></div>}
      <ConfirmDialog open={confirmCancel} title={`Cancel order ${orderNumber}?`} confirmLabel="Cancel order" busy={busy} onConfirm={() => void call({ action: "cancel" }, "Order cancelled and reserved stock released.")} onCancel={() => setConfirmCancel(false)}>
        {paymentStatus === "PAID" ? "This order is already paid. Cancelling does not refund the customer; refund it in the Stripe dashboard." : "The customer has not paid. Reserved stock will be released."}
      </ConfirmDialog>
    </section>
  );
}
