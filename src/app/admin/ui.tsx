import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export const inputClass = "min-h-11 w-full min-w-0 rounded-xl border border-forest/20 bg-white px-3 text-sm focus-visible:outline-3 focus-visible:outline-citrus";
export const btnPrimary = "inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 text-sm font-bold text-white transition hover:bg-forest/90 focus-visible:outline-3 focus-visible:outline-citrus disabled:opacity-50";
export const btnOutline = "inline-flex min-h-11 items-center justify-center rounded-full border border-forest/30 bg-white px-5 text-sm font-bold text-forest transition hover:bg-leaf-soft focus-visible:outline-3 focus-visible:outline-citrus disabled:opacity-50";
export const btnDanger = "inline-flex min-h-11 items-center justify-center rounded-full border border-berry-deep/40 bg-white px-5 text-sm font-bold text-berry-deep transition hover:bg-berry/10 focus-visible:outline-3 focus-visible:outline-citrus disabled:opacity-50";
export const cardClass = "rounded-2xl border border-cream-deep bg-white shadow-soft";

export function AdminHeader({ title, subtitle, icon, actions }: { title: string; subtitle?: string; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <Link href="/admin" className="mb-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-forest hover:underline focus-visible:outline-3 focus-visible:outline-citrus">
          <ArrowLeft size={14} aria-hidden="true" /> Back to operator portal
        </Link>
        <div className="flex items-center gap-2">
          {icon && <span className="rounded-full bg-leaf-soft p-1.5 text-forest" aria-hidden="true">{icon}</span>}
          <h1 className="font-display text-2xl font-black tracking-tight text-forest sm:text-4xl">{title}</h1>
        </div>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

const TONES = {
  good: "bg-leaf text-ink",
  info: "bg-sun/40 text-ink",
  warn: "bg-citrus/50 text-ink",
  bad: "bg-berry/20 text-berry-deep",
  muted: "bg-cream-deep text-ink-soft"
} as const;

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONES[tone]}`}>{children}</span>;
}

export const STATE_TONE = { VERIFIED: "good", SUGGESTED: "info", PENDING_APPROVAL: "warn", MISSING_CONFIGURATION: "bad" } as const;

export function Notice({ kind, children }: { kind: "ok" | "error" | "warn"; children: ReactNode }) {
  const tone = kind === "ok" ? "border-forest/30 bg-leaf/10 text-forest" : kind === "warn" ? "border-citrus bg-citrus/20 text-ink" : "border-berry-deep/30 bg-berry/10 text-berry-deep";
  return <p role={kind === "error" ? "alert" : "status"} className={`rounded-2xl border p-3 text-sm font-semibold ${tone}`}>{children}</p>;
}

/** Portal home heading: same type scale as AdminHeader, without the back link. */
export function AdminHeaderless({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-display text-2xl font-black tracking-tight text-forest sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-soft">{subtitle}</p>}
    </header>
  );
}
