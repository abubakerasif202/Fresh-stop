import Link from "next/link";
export const metadata = { title: "Payment processing — Fresh Stop", robots: { index: false, follow: false } };
export default function ShopSuccessPage() {
  return <main className="page-width py-16">
    <h1 className="section-title">Thank you for your order request</h1>
    <p className="mt-5 max-w-2xl text-ink-soft">Stripe is processing your test payment. Fresh Stop confirms and prepares an order only after Stripe sends a verified payment-success webhook. Returning to this page does not confirm payment.</p>
    <Link href="/shop" className="button button-green mt-7">Back to sandbox shop</Link>
  </main>;
}
