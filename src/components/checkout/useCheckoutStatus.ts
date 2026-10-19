"use client";

import { useEffect, useState } from "react";

export interface Availability {
  delivery: boolean;
  pickup: boolean;
}

export const CLOSED: Availability = { delivery: false, pickup: false };
const STATUS_TIMEOUT_MS = 6000;

async function isEnabled(fulfillment: "DELIVERY" | "PICKUP", signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`/api/checkout/status?fulfillment=${fulfillment}`, { cache: "no-store", signal });
    if (!res.ok) return false;
    const data: { enabled?: unknown } = await res.json();
    return data.enabled === true;
  } catch {
    return false;
  }
}

/** Asks the server whether paid checkout is open per fulfilment type. Any failure or ambiguity means closed. */
export function useCheckoutStatus(): [Availability | null, (next: Availability) => void] {
  const [availability, setAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;
    const timer = window.setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
    Promise.all([isEnabled("DELIVERY", controller.signal), isEnabled("PICKUP", controller.signal)])
      .then(([delivery, pickup]) => {
        if (mounted) setAvailability({ delivery, pickup });
      })
      .finally(() => window.clearTimeout(timer));
    return () => {
      mounted = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  return [availability, setAvailability];
}
