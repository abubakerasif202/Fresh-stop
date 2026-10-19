import Link from "next/link";
import { ArrowLeft, Settings, Shield, CreditCard, Activity } from "lucide-react";
import { db } from "@/lib/db";
import { CONTACT } from "@/lib/contact";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [branches, auditLogs] = await Promise.all([
    db.storeBranch.findMany({ orderBy: { name: "asc" } }),
    db.adminAuditLog.findMany({ take: 15, orderBy: { createdAt: "desc" } })
  ]);

  const stripeConfigured = isStripeConfigured();
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/admin"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline"
          >
            <ArrowLeft size={14} /> Back to Operator Portal
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-leaf-soft p-1.5 text-forest">
              <Settings size={20} />
            </span>
            <h1 className="font-display text-3xl font-black text-forest tracking-tight sm:text-4xl">
              System Settings &amp; Merchant Configuration
            </h1>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Manage business parameters, integration secrets, store hubs and administrative audit logs.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gateway & Integrations Status */}
        <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="text-forest" size={20} />
            <h2 className="font-display font-black text-forest text-lg">Payments &amp; Gateway</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-forest/10 pb-3">
              <div>
                <span className="font-bold text-forest block">Stripe Payment Gateway</span>
                <span className="text-ink-soft">AUD card payments, Apple Pay &amp; Google Pay</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                  stripeConfigured ? "bg-leaf-soft text-deep-green" : "bg-sun/30 text-amber-900"
                }`}
              >
                {stripeConfigured ? "Configured (Active)" : "Pending API Keys"}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-forest/10 pb-3">
              <div>
                <span className="font-bold text-forest block">Order Notifications (Resend)</span>
                <span className="text-ink-soft">Customer confirmation &amp; store alert emails</span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                  resendConfigured ? "bg-leaf-soft text-deep-green" : "bg-sun/30 text-amber-900"
                }`}
              >
                {resendConfigured ? "Configured" : "Simulated Local"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-forest block">Currency &amp; GST Compliance</span>
                <span className="text-ink-soft">Australian Dollars (AUD) &bull; Subdiv 38-A GST Rules</span>
              </div>
              <span className="rounded-full bg-leaf-soft px-2.5 py-0.5 text-[10px] font-black text-deep-green">
                AUD Compliant
              </span>
            </div>
          </div>
        </div>

        {/* Business Contact Configuration */}
        <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-forest" size={20} />
            <h2 className="font-display font-black text-forest text-lg">Merchant &amp; Store Hubs</h2>
          </div>

          <div className="space-y-3 text-xs text-ink-soft">
            <p>
              <strong className="text-forest">Merchant Entity:</strong> Fresh Stop Pty Ltd
            </p>
            <p>
              <strong className="text-forest">Business Email:</strong> {CONTACT.email}
            </p>
            <p>
              <strong className="text-forest">Customer Support Phone:</strong> {CONTACT.phoneDisplay}
            </p>
            <p>
              <strong className="text-forest">Active Branches:</strong> {branches.map((b) => `${b.name} (${b.suburb})`).join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Audit Logs */}
      <div className="mt-8 rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="text-forest" size={20} />
          <h2 className="font-display font-black text-forest text-lg">Recent Administrative Activity Logs</h2>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-ink-soft py-4">No administrative actions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-forest/10 text-[10px] font-black uppercase text-forest/70">
                <tr>
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Entity</th>
                  <th className="py-2">Operator</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-cream/20">
                    <td className="py-2.5 text-ink-soft whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-AU")}
                    </td>
                    <td className="py-2.5 font-bold text-forest">{log.action}</td>
                    <td className="py-2.5 text-ink-soft">{log.entityType}</td>
                    <td className="py-2.5 font-mono">{log.adminUser}</td>
                    <td className="py-2.5 text-ink font-medium">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
