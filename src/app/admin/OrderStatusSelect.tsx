"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

interface OrderStatusSelectProps {
  orderId: string;
  orderNumber?: string;
  initialStatus: string;
}

// Light backgrounds with ink text only (no white text on leaf/citrus/sun).
const STATUS_OPTIONS = [
  { value: "RECEIVED", label: "Received", color: "bg-sun text-ink border-sun" },
  { value: "PREPARING", label: "Preparing", color: "bg-citrus text-ink border-citrus" },
  { value: "READY", label: "Ready for Pickup", color: "bg-leaf text-ink border-leaf" },
  { value: "DISPATCHED", label: "Dispatched", color: "bg-leaf-soft text-forest border-leaf" },
  { value: "COMPLETED", label: "Completed", color: "bg-forest text-cream border-forest" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-berry text-ink border-berry" }
];

export function OrderStatusSelect({ orderId, orderNumber, initialStatus }: OrderStatusSelectProps) {
  const router = useRouter();
  const selectId = useId();
  const [status, setStatus] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const previous = status;
    const newStatus = e.target.value;
    setStatus(newStatus);
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, orderStatus: newStatus })
      });

      if (!res.ok) {
        throw new Error(`Update failed (${res.status})`);
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setStatus(previous);
      setError("Could not update status. Try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const currentOption = STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="sr-only">
        {`Fulfillment status for order ${orderNumber ?? orderId}`}
      </label>
      <div className="flex items-center gap-2">
        <select
          id={selectId}
          value={status}
          disabled={isUpdating}
          onChange={handleChange}
          className={`min-h-9 cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition focus-visible:outline-3 focus-visible:outline-citrus disabled:cursor-wait disabled:opacity-60 ${currentOption.color}`}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-cream font-medium text-ink">
              {opt.label}
            </option>
          ))}
        </select>
        {isUpdating && (
          <span role="status" aria-live="polite" className="animate-pulse text-[11px] text-ink-soft">
            Saving...
          </span>
        )}
      </div>
      {error && (
        <span role="alert" className="text-[11px] font-semibold text-berry-deep">
          {error}
        </span>
      )}
    </div>
  );
}
