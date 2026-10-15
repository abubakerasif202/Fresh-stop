"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
}

export function QuantityStepper({ name, quantity, onChange }: QuantityStepperProps) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full text-forest transition hover:bg-leaf/25 active:scale-90 cursor-pointer";
  return (
    <div
      role="group"
      aria-label={`Quantity of ${name}`}
      className="inline-flex items-center gap-0.5 rounded-full bg-leaf/15 p-0.5 ring-1 ring-leaf/40"
    >
      <button type="button" className={btn} aria-label={`Decrease quantity of ${name}`} onClick={() => onChange(quantity - 1)}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-6 text-center text-sm font-bold tabular-nums text-ink" aria-live="polite">
        {quantity}
      </span>
      <button type="button" className={btn} aria-label={`Increase quantity of ${name}`} onClick={() => onChange(quantity + 1)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
