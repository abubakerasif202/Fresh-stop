"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";

export function VerifyOrderForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, email })
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };
      if (res.ok && data.token) {
        router.replace(`/order-confirmation/${encodeURIComponent(orderId)}?t=${encodeURIComponent(data.token)}`);
        router.refresh();
        return;
      }
      setError(data.error || "We couldn't verify that order.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left" noValidate>
      <label htmlFor="verify-email" className="block text-sm font-bold text-ink">
        Email used for this order
      </label>
      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" aria-hidden="true" />
        <input
          id="verify-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="verify-error"
          className="w-full rounded-full border border-forest/20 bg-white pl-10 pr-4 py-3 text-sm text-ink focus-visible:outline-3 focus-visible:outline-citrus"
        />
      </div>
      <p id="verify-error" role="alert" aria-live="polite" className="min-h-5 text-sm font-semibold text-berry">
        {error}
      </p>
      <button
        type="submit"
        disabled={pending || !email.trim()}
        className="inline-flex w-full items-center justify-center rounded-full bg-citrus hover:bg-citrus-deep hover:text-white text-ink px-6 py-3.5 text-sm font-black shadow-soft transition disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-forest"
      >
        {pending ? "Verifying…" : "View order details"}
      </button>
    </form>
  );
}
