"use client";

import { useBranchStore } from "@/lib/store/useBranchStore";
import { useHydratedStore } from "@/lib/store/useHydratedStore";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

interface StoreActionsProps {
  slug: "rockdale" | "riverwood";
  name: string;
}

export function StoreActions({ slug, name }: StoreActionsProps) {
  const currentBranch = useHydratedStore(useBranchStore, (s) => s.currentBranch);
  const setBranch = useBranchStore((s) => s.setBranch);

  const isCurrent = currentBranch?.slug === slug;

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-4">
      {isCurrent ? (
        <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-green-700 text-white shadow-2xs">
          <Check className="h-4 w-4" aria-hidden="true" />
          Active Store Selected
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setBranch(slug)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
          aria-label={`Select ${name} as your primary pickup store`}
        >
          Select As My Store
        </button>
      )}

      <Link
        href={`/products?branch=${slug}`}
        aria-label={`Browse produce and groceries at ${name}`}
        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-green-700 hover:text-green-800 hover:bg-green-50 transition"
      >
        <span>Browse Products</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
