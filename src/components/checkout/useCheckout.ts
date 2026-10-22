"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import {
  EMPTY_FORM,
  buildCheckoutPayload,
  interpretCheckoutResponse,
  nextIdempotencyKey,
  validateCheckoutForm,
  type CheckoutForm,
  type Conflict,
  type FormErrors
} from "@/lib/cart-checkout";
import { CLOSED, type Availability } from "./useCheckoutStatus";
import { useDeliveryCheck } from "./useDeliveryCheck";

const REQUEST_TIMEOUT_MS = 25_000;
const FIELD_ORDER: (keyof CheckoutForm)[] = ["branch", "name", "email", "phone", "address", "suburb", "postcode", "preferredDate"];

export function useCheckout(setAvailability: (a: Availability) => void) {
  const { items, refreshCart, estimatedSubtotalCents } = useCart();
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const delivery = useDeliveryCheck(form.postcode, form.fulfillmentType === "DELIVERY", estimatedSubtotalCents);

  // Returning via the browser's back button restores the page from cache with the button still locked.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        inFlight.current = false;
        setSubmitting(false);
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const setField = useCallback(<K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    setMessage(null);
    setConflicts([]);
    const found = validateCheckoutForm(form);
    if (form.fulfillmentType === "DELIVERY" && !found.postcode && !(delivery.checked && delivery.eligible)) {
      found.postcode = delivery.checked ? "We do not deliver to this postcode online yet." : "Wait for the postcode check to finish.";
    }
    setErrors(found);
    const first = FIELD_ORDER.find((k) => found[k]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    const fingerprint = JSON.stringify(buildCheckoutPayload(items, form, ""));
    attempt.current = nextIdempotencyKey(attempt.current, fingerprint, () => crypto.randomUUID());
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCheckoutPayload(items, form, attempt.current.key)),
        signal: controller.signal
      });
      const body: unknown = await response.json().catch(() => null);
      const outcome = interpretCheckoutResponse(response.status, body);
      if (outcome.kind === "redirect") {
        // Keep the button locked while the browser navigates; the cart is NOT cleared here.
        window.location.assign(outcome.url);
        return;
      }
      if (outcome.kind === "conflict") {
        setConflicts(outcome.conflicts);
        setMessage("Some items in your cart changed. We have refreshed your cart; please review it and try again.");
        void refreshCart();
      } else if (outcome.kind === "key-used") {
        attempt.current = null;
        setMessage(outcome.message);
      } else if (outcome.kind === "unavailable") {
        if (outcome.code === "CHECKOUT_DISABLED") setAvailability(CLOSED);
        setMessage("Online payment is not available right now. Please send us an enquiry or try again later.");
      } else {
        if (outcome.kind === "validation") {
          setErrors(outcome.fieldErrors);
          document.getElementById(FIELD_ORDER.find((k) => outcome.fieldErrors[k]) ?? "")?.focus();
        }
        setMessage("message" in outcome ? outcome.message : null);
      }
    } catch {
      setMessage("We could not confirm the checkout response. Check your connection and retry without changing your cart to resume the same checkout.");
    } finally {
      window.clearTimeout(timer);
    }
    inFlight.current = false;
    setSubmitting(false);
  }, [form, items, delivery, refreshCart, setAvailability]);

  return { form, errors, setField, submitting, message, conflicts, delivery, submit };
}
