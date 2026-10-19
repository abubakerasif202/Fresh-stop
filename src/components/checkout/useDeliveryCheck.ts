"use client";

import { useEffect, useState } from "react";
import { NO_DELIVERY_INFO, parseDeliveryResponse, type DeliveryInfo } from "@/lib/cart-checkout";

const DEBOUNCE_MS = 300;

/** Looks up delivery eligibility for a complete 4-digit postcode. Fees/minimums come only from the API. */
export function useDeliveryCheck(postcode: string, enabled: boolean, subtotalCents: number): DeliveryInfo {
  const [result, setResult] = useState<{ key: string; info: DeliveryInfo } | null>(null);
  const clean = postcode.trim();
  const valid = enabled && /^\d{4}$/.test(clean);
  const key = `${clean}:${subtotalCents}`;

  useEffect(() => {
    if (!valid) {
      setResult(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/delivery/check?postcode=${encodeURIComponent(clean)}&subtotalCents=${subtotalCents}`, { signal: controller.signal, cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("Delivery check failed");
          return res.json();
        })
        .then((data: unknown) => {
          if (!controller.signal.aborted) setResult({ key, info: parseDeliveryResponse(data) });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
          setResult({ key, info: { ...NO_DELIVERY_INFO, checked: true, message: "We could not verify that postcode right now. Please try again." } });
        });
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [clean, valid, subtotalCents, key]);

  // A previous postcode or subtotal must never supply eligibility while the new check is pending.
  return valid && result?.key === key ? result.info : NO_DELIVERY_INFO;
}
