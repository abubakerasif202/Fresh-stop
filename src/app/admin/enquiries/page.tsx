import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { usesReviewedSnapshot } from "@/lib/catalogue-data";
import { ENQUIRY_KIND_VALUES, ENQUIRY_STATUSES, listEnquiries, pickOf } from "@/lib/admin-enquiries";
import { AdminHeader, Badge, btnOutline, btnPrimary, cardClass, inputClass } from "../ui";
import { EnquiryActions } from "./EnquiryActions";

export const metadata: Metadata = { title: "Enquiries", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (d: Date) => d.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const statusTone = (s: string) => (s === "NEW" ? "warn" : s === "CONTACTED" ? "info" : "muted");

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-bold text-forest">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm text-ink">{value}</dd>
    </div>
  );
}

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (usesReviewedSnapshot()) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><p className="rounded-2xl border border-forest/30 bg-leaf/10 p-5 font-semibold text-forest">Enquiries are not available in the read-only catalogue Preview.</p></div>;
  }
  const params = await searchParams;
  const kind = pickOf(ENQUIRY_KIND_VALUES, params.kind);
  const status = pickOf(ENQUIRY_STATUSES, params.status);
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const { enquiries, total, pageSize } = await listEnquiries({ kind, status, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (p: number) => `/admin/enquiries?${new URLSearchParams({ ...(kind ? { kind } : {}), ...(status ? { status } : {}), page: String(p) })}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <AdminHeader title="Enquiries" icon={<Inbox size={20} />} subtitle="Wholesale and general enquiries from the website. Every enquiry is saved here even if the owner email could not be sent." />
      <form method="get" action="/admin/enquiries" className={`${cardClass} mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
        <div>
          <label htmlFor="f-kind" className="mb-1 block text-xs font-bold">Type</label>
          <select id="f-kind" name="kind" defaultValue={kind ?? ""} className={inputClass}>
            <option value="">All</option>{ENQUIRY_KIND_VALUES.map((k) => <option key={k} value={k}>{k === "WHOLESALE" ? "Wholesale" : "General"}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-status" className="mb-1 block text-xs font-bold">Status</label>
          <select id="f-status" name="status" defaultValue={status ?? ""} className={inputClass}>
            <option value="">All</option>{ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <button type="submit" className={btnPrimary}>Apply filters</button>
      </form>

      <p className="mb-3 text-sm text-ink-soft" aria-live="polite">{total} enquir{total === 1 ? "y" : "ies"}</p>
      {enquiries.length === 0 ? (
        <p className={`${cardClass} p-8 text-center text-sm text-ink-soft`}>No enquiries match these filters.</p>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((e) => (
            <li key={e.id} className={`${cardClass} grid gap-4 p-4 lg:grid-cols-[1fr_auto]`}>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <strong className="break-words text-forest">{e.businessName ?? e.name}</strong>
                  <Badge tone={statusTone(e.status)}>{e.status}</Badge>
                  <Badge tone="muted">{e.kind === "WHOLESALE" ? "Wholesale" : "General"}</Badge>
                  <Badge tone={e.emailSentAt ? "good" : "bad"}>{e.emailSentAt ? "Owner emailed" : "Owner not emailed"}</Badge>
                  <span className="text-xs text-ink-soft">{when(e.createdAt)}</span>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <Detail label="Name" value={e.name} />
                  <Detail label="Email" value={e.email} />
                  <Detail label="Phone" value={e.phone} />
                  <Detail label="Estimated quantity" value={e.estimatedQuantity} />
                  <Detail label="Products" value={e.products} />
                  <Detail label="Message" value={e.message} />
                </dl>
              </div>
              <EnquiryActions enquiryId={e.id} status={e.status} emailSent={Boolean(e.emailSentAt)} />
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
