"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { useBranchStore } from "@/lib/store/useBranchStore";
import { ENQUIRE_LABEL } from "@/lib/product-commerce";

/** Leads to the selected store's verified contact card. Never adds to the basket. */
export function EnquireLink({ name, large = false, fill = false }: { name: string; large?: boolean; fill?: boolean }) {
  const branch = useBranchStore((s) => s.currentBranch);
  return (
    <Link
      href={`/stores#${branch.slug}`}
      aria-label={`${ENQUIRE_LABEL} about ${name} (${branch.name})`}
      className={`${fill ? "w-full justify-center " : ""}inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-forest bg-white font-semibold text-forest transition-colors hover:bg-forest hover:text-white focus-visible:outline-3 focus-visible:outline-citrus ${large ? "min-h-12 px-7 py-3 font-bold" : "min-h-11 px-4 text-sm"}`}
    >
      <Phone className="h-4 w-4" aria-hidden="true" />
      <span>{ENQUIRE_LABEL}</span>
    </Link>
  );
}
