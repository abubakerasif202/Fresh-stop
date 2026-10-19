"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Truck, Store, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { MIN_ORDER_AMOUNT, FREE_DELIVERY_THRESHOLD } from "@/types/cart";

export default function CheckoutPage() {
  const { items, totals } = useCart();

  const [fulfillmentType, setFulfillmentType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [selectedBranch, setSelectedBranch] = useState("rockdale");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state] = useState("NSW");
  const [postcode, setPostcode] = useState("");
  const [notes, setNotes] = useState("");
  const [preferredDate, setPreferredDate] = useState("");

  const [postcodeStatus, setPostcodeStatus] = useState<{
    checked: boolean;
    eligible: boolean;
    message: string;
    deliveryFee?: number;
  }>({ checked: false, eligible: false, message: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Postcode Checking
  useEffect(() => {
    const clean = postcode.trim();
    if (clean.length === 4 && /^\d{4}$/.test(clean)) {
      fetch(`/api/delivery/check?postcode=${encodeURIComponent(clean)}&subtotal=${totals.subtotal}`)
        .then((res) => res.json())
        .then((data) => {
          setPostcodeStatus({
            checked: true,
            eligible: data.eligible,
            message: data.message,
            deliveryFee: data.deliveryFee
          });
        })
        .catch(() => {
          setPostcodeStatus({
            checked: true,
            eligible: false,
            message: "Unable to verify postcode. Please check your network."
          });
        });
    } else {
      setPostcodeStatus({ checked: false, eligible: false, message: "" });
    }
  }, [postcode, totals.subtotal]);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-black text-forest">Your basket is empty</h1>
        <p className="mt-3 text-sm text-ink-soft">
          You don&apos;t have any groceries in your cart to checkout.
        </p>
        <Link href="/products" className="button button-green mt-6">
          Start Shopping
        </Link>
      </div>
    );
  }

  const effectiveDeliveryFee =
    fulfillmentType === "PICKUP"
      ? 0
      : totals.subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : postcodeStatus.deliveryFee ?? totals.deliveryFee;

  const finalTotal = totals.subtotal + effectiveDeliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (totals.subtotal < MIN_ORDER_AMOUNT) {
      setErrorMessage(`Minimum order amount is $${MIN_ORDER_AMOUNT.toFixed(2)} AUD.`);
      return;
    }

    if (fulfillmentType === "DELIVERY") {
      if (!postcodeStatus.checked || !postcodeStatus.eligible) {
        setErrorMessage("Please enter an eligible Sydney delivery postcode.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, slug: i.slug, quantity: i.quantity })),
          customer: {
            name,
            email,
            phone,
            address: fulfillmentType === "DELIVERY" ? address : `Click & Collect (${selectedBranch})`,
            suburb: fulfillmentType === "DELIVERY" ? suburb : selectedBranch,
            state,
            postcode: fulfillmentType === "DELIVERY" ? postcode : "2216",
            notes,
            preferredDeliveryDate: preferredDate
          },
          fulfillmentType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to start payment session.");
        setIsSubmitting(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMessage("Payment gateway returned an invalid redirect URL.");
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error. Please try again.";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Link
          href="/cart"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline"
        >
          <ArrowLeft size={14} /> Back to Cart
        </Link>
        <h1 className="font-display text-3xl font-black text-forest sm:text-4xl">
          Complete Your Order
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Fresh groceries hand-packed and delivered from our Rockdale and Riverwood hubs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Form: Customer Details */}
        <div className="space-y-6 lg:col-span-7">
          {/* Fulfillment Toggle */}
          <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-lg font-black text-forest mb-4">
              1. Fulfillment Method
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillmentType("DELIVERY")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition ${
                  fulfillmentType === "DELIVERY"
                    ? "border-deep-green bg-leaf-soft/60 font-black text-forest shadow-xs"
                    : "border-forest/20 text-ink-soft hover:bg-cream"
                }`}
              >
                <Truck size={24} className={fulfillmentType === "DELIVERY" ? "text-deep-green" : "text-ink-soft"} />
                <span className="text-sm">Sydney Delivery</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfillmentType("PICKUP")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition ${
                  fulfillmentType === "PICKUP"
                    ? "border-deep-green bg-leaf-soft/60 font-black text-forest shadow-xs"
                    : "border-forest/20 text-ink-soft hover:bg-cream"
                }`}
              >
                <Store size={24} className={fulfillmentType === "PICKUP" ? "text-deep-green" : "text-ink-soft"} />
                <span className="text-sm">Click &amp; Collect</span>
              </button>
            </div>

            {fulfillmentType === "PICKUP" && (
              <div className="mt-4 rounded-xl bg-cream p-4 text-xs font-bold text-forest">
                <label className="block mb-2">Choose Store Hub for Collection:</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full rounded-lg border border-forest/20 bg-white p-2.5 text-sm font-semibold"
                >
                  <option value="rockdale">Fresh Stop Rockdale (Shop 1, 2-4 King Street)</option>
                  <option value="riverwood">Fresh Stop Riverwood (319 Belmore Rd)</option>
                </select>
                <p className="mt-2 text-ink-soft">
                  Collection is available between 8:00 AM – 7:00 PM Monday to Saturday.
                </p>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
            <h2 className="font-display text-lg font-black text-forest mb-4">
              2. Contact Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-ink mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com.au"
                  className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Australian Phone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0412 345 678"
                  className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                />
              </div>
            </div>
          </div>

          {/* Delivery Address (only if delivery chosen) */}
          {fulfillmentType === "DELIVERY" && (
            <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-soft">
              <h2 className="font-display text-lg font-black text-forest mb-4">
                3. Delivery Address (Sydney, NSW)
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 King Street, Unit 4"
                    className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Suburb *</label>
                  <input
                    type="text"
                    required
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="Rockdale / Kogarah"
                    className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Sydney Postcode *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="2216"
                    className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                  />
                </div>

                {postcodeStatus.checked && (
                  <div
                    className={`sm:col-span-2 rounded-xl p-3 text-xs font-bold ${
                      postcodeStatus.eligible
                        ? "bg-leaf-soft text-deep-green border border-deep-green/20"
                        : "bg-red-50 text-brand-red border border-brand-red/20"
                    }`}
                  >
                    {postcodeStatus.message}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Preferred Delivery Date</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-ink mb-1">Delivery Instructions / Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Leave in shaded porch by the front door if unattended."
                    className="w-full rounded-xl border border-forest/20 px-3.5 py-2.5 text-sm focus-visible:outline-3 focus-visible:outline-citrus"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Summary: Totals & Stripe Action */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-xl font-black text-forest">Order Breakdown</h2>

            <ul className="mt-4 max-h-60 divide-y divide-forest/10 overflow-y-auto pr-1 text-sm">
              {items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-forest/10 bg-cream">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-forest text-xs sm:text-sm truncate">{item.name}</p>
                      <p className="text-[11px] text-ink-soft">
                        {item.quantity} × ${item.price.toFixed(2)} / {item.unit}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-forest text-xs sm:text-sm shrink-0">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-2.5 border-t border-forest/10 pt-4 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="font-bold text-ink">${totals.subtotal.toFixed(2)} AUD</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Delivery</span>
                <span className="font-bold text-ink">
                  {effectiveDeliveryFee === 0 ? (
                    <span className="text-deep-green font-extrabold">FREE</span>
                  ) : (
                    `$${effectiveDeliveryFee.toFixed(2)} AUD`
                  )}
                </span>
              </div>
              {totals.gstTotal > 0 && (
                <div className="flex justify-between text-xs text-ink-soft">
                  <span>Included Australian GST</span>
                  <span>${totals.gstTotal.toFixed(2)} AUD</span>
                </div>
              )}
              <div className="flex justify-between border-t border-forest/10 pt-3 text-lg font-black text-forest">
                <span>Final Total</span>
                <span>${finalTotal.toFixed(2)} AUD</span>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-brand-red border border-brand-red/20"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`button button-red mt-5 w-full justify-center py-4 text-center text-base shadow-soft ${
                isSubmitting ? "opacity-75 cursor-wait" : ""
              }`}
            >
              {isSubmitting ? (
                <span>Connecting to Stripe Checkout…</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Lock size={17} /> Pay with Stripe (${finalTotal.toFixed(2)} AUD)
                </span>
              )}
            </button>

            <div className="mt-4 flex flex-col gap-2 text-center text-xs text-ink-soft">
              <p className="flex items-center justify-center gap-1.5 font-semibold text-deep-green">
                <ShieldCheck size={16} /> Encrypted Stripe Checkout &bull; Card, Apple Pay &amp; Google Pay
              </p>
              <p className="text-[11px]">
                Charges processed in Australian Dollars (AUD). No credit card surcharges apply.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
