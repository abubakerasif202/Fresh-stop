import type { Metadata } from "next";
import { OrderLookupForm } from "./OrderLookupForm";

export const metadata: Metadata = {
  title: "Find your order",
  robots: { index: false, follow: false }
};

export default function OrdersPage() {
  return (
    <section className="mx-auto max-w-lg px-4 py-14 sm:py-20">
      <p className="text-sm font-bold uppercase tracking-wider text-forest">Your Fresh Stop order</p>
      <h1 className="mt-3 font-display text-4xl font-black">Back to your basket.</h1>
      <p className="mt-4 text-ink-soft">Enter your order reference and the email used at checkout to view your receipt and order status.</p>
      <OrderLookupForm />
    </section>
  );
}
