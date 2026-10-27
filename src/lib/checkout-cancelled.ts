/** True when the URL query carries the flag Stripe's cancel_url adds after a customer leaves Checkout. */
export function isCheckoutCancelled(search: string): boolean {
  return new URLSearchParams(search).get("cancelled") === "1";
}
