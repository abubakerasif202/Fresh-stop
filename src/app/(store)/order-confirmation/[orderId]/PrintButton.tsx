"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="button button-outline text-forest w-full justify-center text-xs"
    >
      <Printer size={15} /> Print Order Summary
    </button>
  );
}
