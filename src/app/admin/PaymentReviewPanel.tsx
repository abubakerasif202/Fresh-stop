import Link from "next/link";
import { loadPaymentReview } from "@/lib/admin-payment-review";
import { Badge, btnOutline, cardClass } from "./ui";
import { AcknowledgeButton } from "./AcknowledgeButton";

/** Webhook-detected payment problems awaiting an admin. Read-only except for the acknowledge note. */
export async function PaymentReviewPanel() {
  const { flags, failedEvents } = await loadPaymentReview();
  if (flags.length === 0 && failedEvents.length === 0) return null;
  const when = (d: Date) => d.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  return (
    <section aria-labelledby="pay-review-h" className={`${cardClass} mb-5 border-2 border-citrus p-4`}>
      <h2 id="pay-review-h" className="mb-2 font-display text-lg font-black text-forest">Payments needing review</h2>
      <p className="mb-3 text-xs text-ink-soft">Raised automatically from Stripe events. Acknowledging records that you looked; it never changes payment status.</p>
      <ul className="space-y-2">
        {flags.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cream p-2 text-sm">
            <span className="min-w-0 break-words">
              <Link href={`/admin/orders/${f.orderId}`} className="font-black text-forest underline">{f.orderNumber ?? f.orderId}</Link>{" "}
              <Badge tone="warn">{f.code}</Badge> <span className="text-xs text-ink-soft">{f.action === "PAYMENT_FLAGGED" ? "flagged" : "needs review"} · {when(f.createdAt)}</span>
            </span>
            <span className="flex gap-2"><Link href={`/admin/orders/${f.orderId}`} className={btnOutline}>Open</Link><AcknowledgeButton orderId={f.orderId} /></span>
          </li>
        ))}
        {failedEvents.map((e) => (
          <li key={e.id} className="rounded-xl bg-cream p-2 text-sm">
            <Badge tone="bad">{e.code}</Badge> <span className="text-xs text-ink-soft">Failed webhook event {e.eventType} · {when(e.createdAt)}. Stripe will retry; check the logs if it persists.</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
