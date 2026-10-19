import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, ExternalLink, Package, ScrollText, Settings, ShoppingBag, Store, Tag, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { usesReviewedSnapshot } from "@/lib/catalogue-data";
import { getPaidCheckoutStatus } from "@/lib/commerce-gate";
import { GATE_ADMIN_TEXT } from "@/lib/admin-gate-view";
import { countPaymentReview } from "@/lib/admin-payment-review";
import { PaymentReviewPanel } from "./PaymentReviewPanel";
import { AdminHeaderless, Badge, btnPrimary, cardClass } from "./ui";

export const metadata: Metadata = { title: "Operator portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STALE_UNPAID_MS = 60 * 60 * 1000;

const chipLink =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-forest/20 bg-white px-4 text-xs font-bold text-forest shadow-soft transition hover:bg-leaf-soft focus-visible:outline-3 focus-visible:outline-citrus";

async function loadCounts() {
  const staleBefore = new Date(Date.now() - STALE_UNPAID_MS);
  const [pendingPrice, purchasable, unknownStock, approvedZones, paidAwaiting, staleUnpaid, gate, paymentIssues] = await Promise.all([
    db.product.count({ where: { approvalStatus: { not: "APPROVED" } } }),
    db.product.count({ where: { isPurchasable: true } }),
    db.product.count({ where: { OR: [{ stockVerified: false }, { stockQuantity: null }] } }),
    db.deliveryZone.count({ where: { isApproved: true, isActive: true } }),
    db.order.count({ where: { paymentStatus: "PAID", orderStatus: "RECEIVED" } }),
    db.order.count({ where: { paymentStatus: "PENDING", orderStatus: "PENDING_PAYMENT", createdAt: { lt: staleBefore } } }),
    getPaidCheckoutStatus(),
    countPaymentReview()
  ]);
  return { pendingPrice, purchasable, unknownStock, approvedZones, paidAwaiting, staleUnpaid, gate, paymentIssues };
}

export default async function AdminPage() {
  if (usesReviewedSnapshot()) return (
    <div className="page-width py-12">
      <p className="eyebrow text-deep-green">Protected operator portal</p>
      <h1 className="section-title mt-4">Catalogue review</h1>
      <p className="mt-5 max-w-2xl leading-relaxed text-ink-soft">This Preview is read-only. Review catalogue names, images and proposed entries here. Database changes are disabled; historical customer orders remain protected in the live administration system.</p>
      <Link className={`${btnPrimary} mt-7`} href="/admin/products">Review catalogue products</Link>
    </div>
  );

  const c = await loadCounts();
  const stats = [
    { label: "Products awaiting price approval", value: c.pendingPrice, href: "/admin/pricing", Icon: Tag },
    { label: "Purchasable products", value: c.purchasable, href: "/admin/products", Icon: Package },
    { label: "Products with unknown or unverified stock", value: c.unknownStock, href: "/admin/products", Icon: ClipboardList },
    { label: "Approved delivery zones", value: c.approvedZones, href: "/admin/delivery", Icon: Truck }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <AdminHeaderless title="Fresh Stop operator portal" subtitle="Approve prices, verify stock, configure delivery and manage orders." />
      <nav aria-label="Portal sections" className="mb-8 flex flex-wrap gap-2">
        <Link href="/admin/pricing" className={chipLink}><Tag className="h-4 w-4" aria-hidden="true" />Pricing</Link>
        <Link href="/admin/products" className={chipLink}><Store className="h-4 w-4" aria-hidden="true" />Products and stock</Link>
        <Link href="/admin/delivery" className={chipLink}><Truck className="h-4 w-4" aria-hidden="true" />Delivery zones</Link>
        <Link href="/admin/orders" className={chipLink}><ShoppingBag className="h-4 w-4" aria-hidden="true" />Orders</Link>
        <Link href="/admin/audit" className={chipLink}><ScrollText className="h-4 w-4" aria-hidden="true" />Audit log</Link>
        <Link href="/admin/settings" className={chipLink}><Settings className="h-4 w-4" aria-hidden="true" />Settings</Link>
        <Link href="/products" className={chipLink}><ExternalLink className="h-4 w-4" aria-hidden="true" />Storefront</Link>
      </nav>

      <section aria-label="Key counts" className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, href, Icon }) => (
          <Link key={label} href={href} className={`${cardClass} block p-4 transition hover:bg-cream focus-visible:outline-3 focus-visible:outline-citrus`}>
            <div className="mb-2 flex items-start justify-between gap-2 text-xs font-semibold text-ink-soft"><span>{label}</span><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /></div>
            <div className="font-display text-3xl font-black text-ink">{value}</div>
          </Link>
        ))}
      </section>

      <PaymentReviewPanel />
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="gate-h" className={`${cardClass} p-4`}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 id="gate-h" className="font-display text-lg font-black text-forest">Paid checkout</h2>
            <Badge tone={c.gate.enabled ? "good" : "warn"}>{c.gate.enabled ? "Open" : "Closed"}</Badge>
          </div>
          {c.gate.enabled ? <p className="text-sm text-ink-soft">All gate checks pass.</p> : (
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {c.gate.codes.map((code) => <li key={code}>{GATE_ADMIN_TEXT[code]}</li>)}
            </ul>
          )}
          <Link href="/admin/settings" className="mt-3 inline-flex min-h-9 items-center text-xs font-bold text-forest underline">Manage in settings</Link>
        </section>
        <section aria-labelledby="orders-h" className={`${cardClass} p-4`}>
          <h2 id="orders-h" className="mb-2 font-display text-lg font-black text-forest">Orders needing review</h2>
          <ul className="space-y-1 text-sm">
            <li><strong>{c.paidAwaiting}</strong> paid and not yet started</li>
            <li><strong>{c.staleUnpaid}</strong> unpaid for over an hour</li>
            <li><strong>{c.paymentIssues}</strong> with payment problems flagged by Stripe events</li>
          </ul>
          <Link href="/admin/orders?paymentStatus=PAID&orderStatus=RECEIVED" className="mt-3 inline-flex min-h-9 items-center text-xs font-bold text-forest underline">Open paid orders awaiting action</Link>
        </section>
      </div>
    </div>
  );
}
