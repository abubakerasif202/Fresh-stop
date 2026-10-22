import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { usesReviewedSnapshot } from "@/lib/catalogue-data";
import { ADMIN_ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/admin-orders";
import { PaymentReviewPanel } from "../PaymentReviewPanel";
import { AdminHeader, Badge, btnOutline, btnPrimary, cardClass, inputClass } from "../ui";

export const metadata: Metadata = { title: "Orders", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const pick = (list: readonly string[], v: string | undefined) => (v && list.includes(v) ? v : undefined);
const aud = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const when = (d: Date) => d.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const payTone = (s: string) => (s === "PAID" ? "good" : s === "PENDING" ? "info" : "bad");

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (usesReviewedSnapshot()) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><p className="rounded-2xl border border-forest/30 bg-leaf/10 p-5 font-semibold text-forest">Orders are not available in the read-only catalogue Preview.</p></div>;
  }
  const params = await searchParams;
  const orderStatus = pick(ADMIN_ORDER_STATUSES, params.orderStatus);
  const paymentStatus = pick(PAYMENT_STATUSES, params.paymentStatus);
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const where: Prisma.OrderWhereInput = { ...(orderStatus ? { orderStatus } : {}), ...(paymentStatus ? { paymentStatus } : {}) };
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: { id: true, orderNumber: true, createdAt: true, fulfillmentType: true, customerName: true, totalCents: true, paymentStatus: true, orderStatus: true, storeBranch: { select: { name: true } }, reservations: { where: { isBackorder: true }, select: { id: true } } }
    }),
    db.order.count({ where })
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/orders?${new URLSearchParams({ ...(orderStatus ? { orderStatus } : {}), ...(paymentStatus ? { paymentStatus } : {}), page: String(p) })}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <AdminHeader title="Orders" icon={<ShoppingBag size={20} />} subtitle="Payment is confirmed by Stripe only. You can move paid orders through fulfilment, cancel orders, and re-send confirmation emails." />
      <PaymentReviewPanel />
      <form method="get" action="/admin/orders" className={`${cardClass} mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
        <div>
          <label htmlFor="f-payment" className="mb-1 block text-xs font-bold">Payment status</label>
          <select id="f-payment" name="paymentStatus" defaultValue={paymentStatus ?? ""} className={inputClass}>
            <option value="">All</option>{PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-order" className="mb-1 block text-xs font-bold">Order status</label>
          <select id="f-order" name="orderStatus" defaultValue={orderStatus ?? ""} className={inputClass}>
            <option value="">All</option>{ADMIN_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <button type="submit" className={btnPrimary}>Apply filters</button>
      </form>

      <p className="mb-3 text-sm text-ink-soft" aria-live="polite">{total} order{total === 1 ? "" : "s"}</p>
      {orders.length === 0 ? (
        <p className={`${cardClass} p-8 text-center text-sm text-ink-soft`}>No orders match these filters.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className={`${cardClass} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div className="min-w-0">
                <Link href={`/admin/orders/${o.id}`} className="font-black text-forest underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-citrus">{o.orderNumber}</Link>
                <p className="break-words text-sm text-ink">{o.customerName}</p>
                <p className="text-xs text-ink-soft">{when(o.createdAt)} · {o.fulfillmentType === "PICKUP" ? "Pickup" : "Delivery"} · {o.storeBranch?.name ?? "No branch"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm">{aud(o.totalCents)}</strong>
                <Badge tone={payTone(o.paymentStatus)}>{o.paymentStatus}</Badge>
                {o.reservations.length > 0 && <Badge tone="info">Contains backorders</Badge>}
                <Badge tone={o.orderStatus === "CANCELLED" ? "bad" : "muted"}>{o.orderStatus.replace(/_/g, " ")}</Badge>
                <Link href={`/admin/orders/${o.id}`} className={btnOutline}>Open</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
        {page > 1 ? <Link href={link(page - 1)} className={btnOutline}>Previous</Link> : <span />}
        <span className="text-sm text-ink-soft">Page {page} of {pages}</span>
        {page < pages ? <Link href={link(page + 1)} className={btnOutline}>Next</Link> : <span />}
      </nav>
    </div>
  );
}
