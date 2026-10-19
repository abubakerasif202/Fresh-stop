"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

/**
 * Mount on the order-confirmation page with `paid` derived from the SERVER-verified payment status.
 * The cart is cleared only here, after a paid order is confirmed, and never when checkout starts.
 */
export function ClearCartOnPaid({ paid }: { paid: boolean }) {
  const { clearCart, ready } = useCart();
  useEffect(() => {
    if (paid && ready) clearCart();
  }, [paid, ready, clearCart]);
  return null;
}
