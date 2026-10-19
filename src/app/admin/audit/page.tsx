import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { usesReviewedSnapshot } from "@/lib/catalogue-data";
import { AdminHeader, btnOutline, btnPrimary, cardClass, inputClass } from "../ui";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const ENTITY_TYPES = ["Product", "DeliveryZone", "Order", "DeliverySetting"];
const clean = (v: string | undefined, max: number) => (v && v.length <= max && /^[\w.:-]+$/.test(v) ? v : undefined);

function Json({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  let pretty = value;
  try { pretty = JSON.stringify(JSON.parse(value), null, 2); } catch { /* show raw text */ }
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase text-ink-soft">{label}</p>
      <pre tabIndex={0} className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-cream p-2 text-[11px] focus-visible:outline-3 focus-visible:outline-citrus">{pretty}</pre>
    </div>
  );
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (usesReviewedSnapshot()) {
    return <div className="mx-auto max-w-3xl px-4 py-10"><p className="rounded-2xl border border-forest/30 bg-leaf/10 p-5 font-semibold text-forest">The audit log is not available in the read-only catalogue Preview.</p></div>;
  }
  const params = await searchParams;
  const entityType = ENTITY_TYPES.includes(params.entityType ?? "") ? params.entityType : undefined;
  const entityId = clean(params.entityId, 64);
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.page ?? "1", 10) || 1));
  const where: Prisma.AdminAuditLogWhereInput = { ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}) };
  const [logs, total] = await Promise.all([
    db.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.adminAuditLog.count({ where })
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/audit?${new URLSearchParams({ ...(entityType ? { entityType } : {}), ...(entityId ? { entityId } : {}), page: String(p) })}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <AdminHeader title="Audit log" icon={<ScrollText size={20} />} subtitle="Every admin change, with who made it and the values before and after. Read only." />
      <form method="get" action="/admin/audit" className={`${cardClass} mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end`}>
        <div>
          <label htmlFor="a-type" className="mb-1 block text-xs font-bold">Entity type</label>
          <select id="a-type" name="entityType" defaultValue={entityType ?? ""} className={inputClass}>
            <option value="">All</option>{ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="a-id" className="mb-1 block text-xs font-bold">Entity ID</label>
          <input id="a-id" name="entityId" defaultValue={entityId ?? ""} maxLength={64} className={inputClass} />
        </div>
        <button type="submit" className={btnPrimary}>Filter</button>
      </form>

      <p className="mb-3 text-sm text-ink-soft" aria-live="polite">{total} entr{total === 1 ? "y" : "ies"}</p>
      {logs.length === 0 ? <p className={`${cardClass} p-8 text-center text-sm text-ink-soft`}>No entries.</p> : (
        <ol className="space-y-3">
          {logs.map((log) => (
            <li key={log.id} className={`${cardClass} p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="break-words text-sm"><strong className="text-forest">{log.action}</strong> · {log.entityType}{log.entityId ? ` ${log.entityId}` : ""}</p>
                <p className="text-xs text-ink-soft"><time dateTime={log.createdAt.toISOString()}>{log.createdAt.toLocaleString("en-AU")}</time> · <span className="font-mono">{log.adminUser}</span></p>
              </div>
              {log.details && <p className="mt-1 break-words text-xs text-ink-soft">{log.details}</p>}
              {(log.beforeJson || log.afterJson) && (
                <details className="mt-2">
                  <summary className="min-h-8 cursor-pointer text-xs font-bold text-forest">Show before and after</summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2"><Json label="Before" value={log.beforeJson} /><Json label="After" value={log.afterJson} /></div>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
      <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
        {page > 1 ? <Link href={link(page - 1)} className={btnOutline}>Newer</Link> : <span />}
        <span className="text-sm text-ink-soft">Page {page} of {pages}</span>
        {page < pages ? <Link href={link(page + 1)} className={btnOutline}>Older</Link> : <span />}
      </nav>
    </div>
  );
}
