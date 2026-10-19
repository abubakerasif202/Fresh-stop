import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { usesReviewedSnapshot } from "@/lib/catalogue-data";
import { maskRef, nextStatuses } from "@/lib/admin-orders";
import { Badge, btnOutline, cardClass } from "../../ui";
import { OrderActions } from "./OrderActions";

export const metadata: Metadata = { title: "Order detail", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const aud = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  if (usesReviewedSnapshot()) notFound();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { storeBranch: { select: { name: true } }, orderItems: true, reservations: { select: { status: true, quantity: true } } }
  });
  if (!order) notFound();
  const paid = order.paymentStatus === "PAID";
  const rows: [string, string | null][] = [
    ["Stripe session", maskRef(order.stripeSessionId)],
    ["Stripe payment intent", maskRef(order.stripePaymentIntentId)],
    ["Paid at", order.paidAt ? order.paidAt.toLocaleString("en-AU") : null],
    ["Amount paid", order.amountPaidCents === null ? null : aud(order.amountPaidCents)],
    ["Refunded", order.refundedCents ? aud(order.refundedCents) : null]
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <Link href="/admin/orders" className="mb-3 inline-flex min-h-8 items-center text-xs font-bold text-forest hover:underline">Back to orders</Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-black text-forest sm:text-3xl">Order {order.orderNumber}</h1>
        <Badge tone={paid ? "good" : order.paymentStatus === "PENDING" ? "info" : "bad"}>Payment {order.paymentStatus}</Badge>
        <Badge tone={order.orderStatus === "CANCELLED" ? "bad" : "muted"}>{order.orderStatus.replace(/_/g, " ")}</Badge>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="cust" className={`${cardClass} p-4`}>
          <h2 id="cust" className="mb-2 font-display text-lg font-black text-forest">Customer and fulfilment</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline font-bold">Name: </dt><dd className="inline break-words">{order.customerName}</dd></div>
            <div><dt className="inline font-bold">Email: </dt><dd className="inline break-all">{order.customerEmail}</dd></div>
            <div><dt className="inline font-bold">Phone: </dt><dd className="inline">{order.customerPhone}</dd></div>
            <div><dt className="inline font-bold">Type: </dt><dd className="inline">{order.fulfillmentType === "PICKUP" ? `Pickup${order.pickupTimeslot ? `, ${order.pickupTimeslot}` : ""}` : "Delivery"}</dd></div>
            <div><dt className="inline font-bold">Branch: </dt><dd className="inline">{order.storeBranch?.name ?? "None"}</dd></div>
            {order.fulfillmentType === "DELIVERY" && <div><dt className="inline font-bold">Address: </dt><dd className="inline break-words">{[order.deliveryAddress, order.deliverySuburb, order.deliveryPostcode].filter(Boolean).join(", ")}</dd></div>}
            {order.deliveryNotes && <div><dt className="inline font-bold">Notes: </dt><dd className="inline break-words">{order.deliveryNotes}</dd></div>}
          </dl>
        </section>
        <section aria-labelledby="pay" className={`${cardClass} p-4`}>
          <h2 id="pay" className="mb-2 font-display text-lg font-black text-forest">Payment</h2>
          <dl className="space-y-1 text-sm">
            <div><dt className="inline font-bold">Total: </dt><dd className="inline">{aud(order.totalCents)} {order.currency.toUpperCase()}</dd></div>
            {rows.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="inline font-bold">{k}: </dt><dd className="inline font-mono">{v}</dd></div>)}
          </dl>
          <p className="mt-2 text-xs text-ink-soft">Payment can only be confirmed by Stripe. Identifiers show their last 4 characters only.</p>
        </section>
      </div>

      <section aria-labelledby="items" className={`${cardClass} mt-5 p-4`}>
        <h2 id="items" className="mb-2 font-display text-lg font-black text-forest">Items</h2>
        <ul className="divide-y divide-cream-deep text-sm">
          {order.orderItems.map((i) => (
            <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span className="min-w-0 break-words">{i.quantity} × {i.name} <span className="text-ink-soft">({i.unit}, {aud(i.priceCents)} each)</span></span>
              <strong>{aud(i.totalCents)}</strong>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-right text-sm font-black">Total {aud(order.totalCents)}</p>
      </section>

      <OrderActions orderId={order.id} orderNumber={order.orderNumber} status={order.orderStatus} paymentStatus={order.paymentStatus} next={nextStatuses(order)} />
      <p className="mt-4"><Link href={`/admin/audit?entityType=Order&entityId=${order.id}`} className={btnOutline}>View audit history</Link></p>
    </div>
  );
}
