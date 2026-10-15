"use client";

import { useBranchStore, BRANCHES } from "@/lib/store/useBranchStore";
import { MapPin, Clock, Phone, ExternalLink, X, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

export function BranchSelectorModal() {
  const { isModalOpen, closeModal, currentBranch, setBranch } = useBranchStore();

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branch-modal-title"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          aria-label="Close branch selector modal"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
            Choose Your Local Greengrocer
          </span>
          <h2 id="branch-modal-title" className="text-2xl font-bold text-slate-900 mt-2">
            Select Your Fresh Stop Store
          </h2>
          <p className="text-sm text-slate-600">
            Choose your preferred branch for Click & Collect or local Sydney home delivery dispatch.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["rockdale", "riverwood"] as const).map((slug) => {
            const branch = BRANCHES[slug];
            const isSelected = currentBranch.slug === slug;

            return (
              <div
                key={slug}
                onClick={() => setBranch(slug)}
                className={`relative cursor-pointer rounded-xl border-2 p-5 transition-all ${
                  isSelected
                    ? "border-green-600 bg-green-50/40 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Active
                  </div>
                )}

                <h3 className="text-lg font-bold text-slate-900">{branch.name}</h3>

                <div className="mt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{branch.address}, {branch.suburb} NSW {branch.postcode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{branch.hours}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-green-600 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={branch.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800"
                  >
                    View Map <ExternalLink className="h-3 w-3" />
                  </a>
                  <button
                    onClick={() => setBranch(slug)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? "bg-green-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select Branch"}
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
