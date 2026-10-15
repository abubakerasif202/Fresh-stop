"use client";

import { useBranchStore, BRANCHES } from "@/lib/store/useBranchStore";
import { MapPin, Clock, Phone, ExternalLink, X, CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";

export function BranchSelectorModal() {
  const { isModalOpen, closeModal, currentBranch, setBranch } = useBranchStore();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      opener?.focus?.();
    };
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={closeModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-modal-title"
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-cream p-5 shadow-lift animate-rise sm:rounded-3xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={closeModal}
          className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-ink transition hover:bg-leaf-soft"
          aria-label="Close branch selector"
        >
          <X aria-hidden className="h-5 w-5" />
        </button>

        <div className="mb-6 pr-10">
          <span className="inline-block rounded-full bg-leaf-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-forest">
            Choose your store
          </span>
          <h2 id="branch-modal-title" className="mt-3 font-display text-2xl font-bold text-forest sm:text-3xl">
            Which Fresh Stop is yours?
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Pick the store for Click &amp; Collect and your local stock.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["rockdale", "riverwood"] as const).map((slug) => {
            const branch = BRANCHES[slug];
            const isSelected = currentBranch.slug === slug;

            return (
              <div
                key={slug}
                className={`relative flex flex-col rounded-3xl border-2 p-5 transition ${
                  isSelected ? "border-forest bg-white shadow-lift" : "border-forest/10 bg-white hover:border-forest/40"
                }`}
              >
                {isSelected && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-forest px-2.5 py-1 text-xs font-semibold text-white">
                    <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> Active
                  </span>
                )}

                <h3 className="pr-20 font-display text-xl font-bold text-forest">{branch.name}</h3>

                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  <li className="flex items-start gap-2">
                    <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                    <span>
                      {branch.address}, {branch.suburb} NSW {branch.postcode}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                    <span>{branch.hours}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone aria-hidden className="h-4 w-4 shrink-0 text-forest" />
                    <span>{branch.phone}</span>
                  </li>
                </ul>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-5">
                  <a
                    href={branch.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-forest hover:underline"
                  >
                    View map <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setBranch(slug)}
                    aria-pressed={isSelected}
                    className={`min-h-11 rounded-full px-5 text-sm font-semibold transition ${
                      isSelected ? "bg-forest text-white" : "bg-sun text-ink hover:brightness-95"
                    }`}
                  >
                    {isSelected ? "Selected" : "Shop this store"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
