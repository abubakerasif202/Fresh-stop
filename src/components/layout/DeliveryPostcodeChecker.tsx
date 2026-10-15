"use client";

import { CheckCircle2, Truck, XCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useCartStore } from "@/lib/store/useCartStore";
import { BRANCHES } from "@/lib/store/useBranchStore";
import type { DeliveryCheckResult } from "@/lib/delivery";

export function DeliveryPostcodeChecker({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DeliveryCheckResult | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = postcode.trim();
    if (!/^\d{4}$/.test(clean)) {
      setError("Enter a 4-digit postcode.");
      setResult(null);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/delivery/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode: clean, subtotal: getSubtotal() }),
      });
      if (!res.ok) throw new Error("Request failed");
      setResult((await res.json()) as DeliveryCheckResult);
    } catch {
      setResult(null);
      setError("Could not check right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-forest transition hover:bg-leaf-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        <Truck aria-hidden className="h-4 w-4" />
        Delivery check
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-forest/10 bg-white p-4 shadow-lift animate-pop"
        >
          <p className="font-display text-lg font-semibold text-forest">Do we deliver to you?</p>
          <p className="mt-1 text-xs text-ink-soft">
            $9.99 delivery, free over $150, $50 minimum. Click &amp; Collect in about 2 hours.
          </p>
          <form onSubmit={onSubmit} className="mt-3 flex gap-2">
            <label htmlFor={`${panelId}-pc`} className="sr-only">
              Postcode
            </label>
            <input
              id={`${panelId}-pc`}
              inputMode="numeric"
              maxLength={4}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 2216"
              className="h-11 min-w-0 flex-1 rounded-full border border-forest/20 bg-cream px-4 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-leaf"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 shrink-0 rounded-full bg-forest px-4 text-sm font-semibold text-white transition hover:bg-forest-deep disabled:opacity-60"
            >
              {loading ? "Checking" : "Check"}
            </button>
          </form>

          <div aria-live="polite" className="mt-3 text-sm">
            {error && <p className="text-berry-deep">{error}</p>}
            {result && (
              <div className={`rounded-2xl p-3 text-ink ${result.eligible ? "bg-leaf-soft" : "bg-sun/40"}`}>
                <p className="flex items-start gap-2 font-semibold">
                  {result.eligible ? (
                    <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  ) : (
                    <XCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-berry-deep" />
                  )}
                  {result.eligible ? "We deliver to this postcode" : "Outside our delivery area"}
                </p>
                {result.assignedBranch && (
                  <p className="mt-1 text-xs">Dispatched from {BRANCHES[result.assignedBranch].name}</p>
                )}
                <p className="mt-1 text-xs">{result.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
