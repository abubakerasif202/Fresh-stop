import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Settings, Shield } from "lucide-react";
import { db } from "@/lib/db";
import { CONTACT } from "@/lib/contact";
import { isStripeConfigured } from "@/lib/stripe";
import { getPaidCheckoutStatus, PAID_CHECKOUT_DB_FLAG } from "@/lib/commerce-gate";
import { describeGate } from "@/lib/admin-gate-view";
import { AdminHeader, btnOutline } from "../ui";
import { PaidCheckoutPanel } from "./PaidCheckoutPanel";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [branches, flag, gate] = await Promise.all([
    db.storeBranch.findMany({ orderBy: { name: "asc" } }),
    db.deliverySetting.findUnique({ where: { key: PAID_CHECKOUT_DB_FLAG } }),
    getPaidCheckoutStatus()
  ]);
  const view = describeGate(gate);
  const stripeConfigured = isStripeConfigured();
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const pill = (ok: boolean) => `rounded-full px-2.5 py-0.5 text-[10px] font-black ${ok ? "bg-leaf-soft text-deep-green" : "bg-sun/30 text-amber-900"}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <AdminHeader
        title="Settings"
        icon={<Settings size={20} />}
        subtitle="Integration status, store details and the paid checkout gate."
        actions={<Link href="/admin/audit" className={btnOutline}>View audit log</Link>}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="pay-h" className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2"><CreditCard className="text-forest" size={20} aria-hidden="true" /><h2 id="pay-h" className="font-display text-lg font-black text-forest">Payments and email</h2></div>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3 border-b border-forest/10 pb-3">
              <div><span className="block font-bold text-forest">Stripe</span><span className="text-ink-soft">Key present in this environment</span></div>
              <span className={pill(stripeConfigured)}>{stripeConfigured ? "Key configured" : "Not configured"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div><span className="block font-bold text-forest">Order emails (Resend)</span><span className="text-ink-soft">Customer confirmation and store alert</span></div>
              <span className={pill(resendConfigured)}>{resendConfigured ? "Configured" : "Not configured"}</span>
            </div>
          </div>
        </section>
        <section aria-labelledby="store-h" className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2"><Shield className="text-forest" size={20} aria-hidden="true" /><h2 id="store-h" className="font-display text-lg font-black text-forest">Store details</h2></div>
          <div className="space-y-3 text-xs text-ink-soft">
            <p><strong className="text-forest">Business email:</strong> {CONTACT.email}</p>
            <p><strong className="text-forest">Support phone:</strong> {CONTACT.phoneDisplay}</p>
            <p><strong className="text-forest">Branches:</strong> {branches.map((b) => `${b.name} (${b.suburb})`).join(", ")}</p>
          </div>
        </section>
      </div>
      <PaidCheckoutPanel enabled={view.enabled} reasons={view.reasons} dbApproved={flag?.value === "true"} />
    </div>
  );
}
