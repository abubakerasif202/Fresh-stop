"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OrderStatusSelectProps {
  orderId: string;
  initialStatus: string;
}

const STATUS_OPTIONS = [
  { value: "RECEIVED", label: "Received", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "PREPARING", label: "Preparing", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "READY", label: "Ready for Pickup", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "DISPATCHED", label: "Dispatched", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "COMPLETED", label: "Completed", color: "bg-slate-100 text-slate-800 border-slate-200" },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" }
];

export function OrderStatusSelect({ orderId, initialStatus }: OrderStatusSelectProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const previous = status;
    const newStatus = e.target.value;
    setStatus(newStatus);
    setIsUpdating(true);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, orderStatus: newStatus })
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setStatus(previous);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentOption = STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={status}
        disabled={isUpdating}
        onChange={handleChange}
        aria-label={`Update order status from ${currentOption.label}`}
        className={`text-xs font-bold px-2.5 py-1 rounded-full border transition cursor-pointer disabled:opacity-50 ${currentOption.color}`}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-slate-900 font-medium">
            {opt.label}
          </option>
        ))}
      </select>
      {isUpdating && (
        <span role="status" aria-live="polite" className="text-[10px] text-slate-400 animate-pulse">
          Saving...
        </span>
      )}
    </div>
  );
}
