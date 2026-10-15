"use client";

import { useCartStore } from "@/lib/store/useCartStore";
import { useBranchStore } from "@/lib/store/useBranchStore";
import { useHydratedStore } from "@/lib/store/useHydratedStore";
import { checkDeliveryEligibility } from "@/lib/delivery";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, Truck, CreditCard, Banknote, ShieldCheck, ShoppingBasket, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();

  // Hydration-safe Zustand subscriptions
  const hydratedItems = useHydratedStore(useCartStore, (s) => s.items);
  const fulfillmentType = useHydratedStore(useCartStore, (s) => s.fulfillmentType) ?? "PICKUP";
  const savedPostcode = useHydratedStore(useCartStore, (s) => s.deliveryPostcode);
  const currentBranch = useHydratedStore(useBranchStore, (s) => s.currentBranch);

  const setFulfillmentType = useCartStore((s) => s.setFulfillmentType);
  const clearCart = useCartStore((s) => s.clearCart);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPostcode, setDeliveryPostcode] = useState("2216");
  const [pickupTimeslot, setPickupTimeslot] = useState("Today 2:00 PM - 5:00 PM");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PAY_ON_PICKUP" | "STRIPE">("PAY_ON_PICKUP");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Sync savedPostcode once hydrated from store
  useEffect(() => {
    if (savedPostcode && savedPostcode.trim()) {
      setDeliveryPostcode(savedPostcode.trim());
    }
  }, [savedPostcode]);

  const items = hydratedItems ?? [];

  // Calculations
  const subtotal = useMemo(() => {
    return Number(items.reduce((sum, it) => sum + it.price * it.quantity, 0).toFixed(2));
  }, [items]);

  const deliveryCheck = useMemo(() => {
    if (fulfillmentType !== "DELIVERY" || !deliveryPostcode.trim()) return null;
    return checkDeliveryEligibility(deliveryPostcode, subtotal);
  }, [fulfillmentType, deliveryPostcode, subtotal]);

  const deliveryFee = fulfillmentType === "DELIVERY" && deliveryCheck?.eligible ? deliveryCheck.deliveryFee : 0;
  const total = Number((subtotal + deliveryFee).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (items.length === 0) {
      setErrorMsg("Your basket is empty.");
      return;
    }

    if (fulfillmentType === "DELIVERY") {
      if (!deliveryAddress.trim() || !deliveryPostcode.trim()) {
        setErrorMsg("Please provide both a delivery street address and Sydney postcode.");
        return;
      }
      if (deliveryCheck && !deliveryCheck.eligible) {
        setErrorMsg(deliveryCheck.message);
        return;
      }
      if (deliveryCheck && !deliveryCheck.meetsMinimumSpend) {
        setErrorMsg(deliveryCheck.message);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillmentType,
          branchSlug: currentBranch?.slug || "rockdale",
          customerName,
          customerEmail,
          customerPhone,
          deliveryAddress,
          deliveryPostcode,
          deliveryNotes,
          pickupTimeslot,
          items,
          paymentMethod
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process order. Please try again.");
      }

      clearCart();
      router.push(`/order-confirmation/${data.orderId}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  // Hydration skeleton to eliminate empty cart flash
  if (hydratedItems === undefined) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-xl w-64 mb-3"></div>
        <div className="h-4 bg-slate-100 rounded-lg w-96 mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-slate-100 rounded-3xl"></div>
          <div className="lg:col-span-5 h-80 bg-slate-50 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  // Actual empty cart state
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <ShoppingBasket className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">Your Basket is Empty</h1>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
          Explore our seasonal fruit boxes, organic vegetables, and weekly specials to start building your order.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Browse Fresh Produce</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-green-700 transition mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Continue Shopping</span>
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout &amp; Fulfillment</h1>
        <p className="text-sm text-slate-600 mt-1">
          Review your items, choose Click &amp; Collect or Sydney delivery, and complete your order.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {errorMsg && (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-medium flex items-start gap-2.5"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Fulfillment Method */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
            <h2 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Fulfillment Option</span>
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                aria-pressed={fulfillmentType === "PICKUP"}
                onClick={() => setFulfillmentType("PICKUP")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                  fulfillmentType === "PICKUP"
                    ? "border-green-700 bg-green-50/60 text-green-950 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <Store className="h-5 w-5 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-xs font-bold">Click &amp; Collect</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Pick up at {currentBranch?.name || "Rockdale"}
                  </span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                    FREE
                  </span>
                </div>
              </button>

              <button
                type="button"
                aria-pressed={fulfillmentType === "DELIVERY"}
                onClick={() => setFulfillmentType("DELIVERY")}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition cursor-pointer ${
                  fulfillmentType === "DELIVERY"
                    ? "border-green-700 bg-green-50/60 text-green-950 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <Truck className="h-5 w-5 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-xs font-bold">Sydney Home Delivery</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">Dispatched to your door</span>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    From $9.99 (Free over $150)
                  </span>
                </div>
              </button>
            </div>

            {fulfillmentType === "PICKUP" ? (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                  <strong className="block text-slate-900 mb-0.5">
                    Pickup Location: {currentBranch?.name || "Fresh Stop Rockdale"}
                  </strong>
                  <span>{currentBranch?.address || "Shop 1, 2-4 King Street"}, {currentBranch?.suburb || "Rockdale"} NSW {currentBranch?.postcode || "2216"}</span>
                </div>

                <div>
                  <label htmlFor="timeslot" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Preferred Collection Window
                  </label>
                  <select
                    id="timeslot"
                    value={pickupTimeslot}
                    onChange={(e) => setPickupTimeslot(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-green-700 focus:outline-hidden"
                  >
                    <option value="Today 2:00 PM - 5:00 PM">Today: 2:00 PM – 5:00 PM</option>
                    <option value="Today 5:00 PM - 7:30 PM">Today: 5:00 PM – 7:30 PM</option>
                    <option value="Tomorrow 10:00 AM - 1:00 PM">Tomorrow: 10:00 AM – 1:00 PM</option>
                    <option value="Tomorrow 2:00 PM - 6:00 PM">Tomorrow: 2:00 PM – 6:00 PM</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div>
                  <label htmlFor="address" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="address"
                    type="text"
                    required
                    placeholder="e.g. 15 Forest Rd, Apt 4"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-green-700 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label htmlFor="postcode" className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sydney Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="postcode"
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. 2216 or 2210"
                    value={deliveryPostcode}
                    onChange={(e) => setDeliveryPostcode(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-green-700 focus:outline-hidden"
                  />
                </div>

                {deliveryCheck && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 ${
                      deliveryCheck.eligible && deliveryCheck.meetsMinimumSpend
                        ? "bg-green-50 border-green-200 text-green-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    {deliveryCheck.eligible && deliveryCheck.meetsMinimumSpend ? (
                      <CheckCircle2 className="h-4 w-4 text-green-700 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div>
                      <strong className="block font-bold">
                        {deliveryCheck.eligible
                          ? deliveryCheck.zoneName
                          : "Outside standard delivery corridor"}
                      </strong>
                      <span className="text-[11px] block mt-0.5">{deliveryCheck.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Customer Contact */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
            <h2 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>Contact Information</span>
            </h2>

            <div>
              <label htmlFor="fullname" className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullname"
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-green-700 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-green-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mobile Phone <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  placeholder="0400 000 000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-green-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-bold text-slate-700 mb-1.5">
                Delivery Instructions or Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                placeholder="Gate code, leave by side door, or special produce requests..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-green-700 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 3. Payment Method */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs">
            <h2 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Payment Option</span>
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer transition ${
                  paymentMethod === "PAY_ON_PICKUP"
                    ? "border-green-700 bg-green-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "PAY_ON_PICKUP"}
                  onChange={() => setPaymentMethod("PAY_ON_PICKUP")}
                  className="mt-1 text-green-700 focus:ring-green-700"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <Banknote className="h-4 w-4 text-green-700" aria-hidden="true" />
                    <span>Pay at Collection / EFTPOS on Delivery</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pay in-store at pickup via cash or card terminal, or tap EFTPOS upon local delivery arrival.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer transition ${
                  paymentMethod === "STRIPE"
                    ? "border-green-700 bg-green-50/50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "STRIPE"}
                  onChange={() => setPaymentMethod("STRIPE")}
                  className="mt-1 text-green-700 focus:ring-green-700"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <CreditCard className="h-4 w-4 text-green-700" aria-hidden="true" />
                    <span>Credit / Debit Card (Stripe Instant Payment)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Fast and encrypted card checkout. Immediate order confirmation logged for dispatch.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Place Order CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-md hover:shadow-lg transition text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <span>
              {isSubmitting
                ? "Processing Your Order..."
                : `Confirm & Place Order — $${total.toFixed(2)} AUD`}
            </span>
          </button>
        </form>

        {/* Order Summary Sidebar */}
        <aside className="lg:col-span-5" aria-label="Order Summary">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sticky top-24">
            <h2 className="text-base font-black text-slate-900 mb-4">Basket Summary</h2>

            <div className="space-y-3 text-xs max-h-72 overflow-y-auto pr-1 mb-6 divide-y divide-slate-100">
              {items.map((it) => (
                <div key={it.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{it.name}</p>
                    <p className="text-[11px] text-slate-500">
                      ${it.price.toFixed(2)} / {it.unit} × {it.quantity}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    ${(it.price * it.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Produce Subtotal</span>
                <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Fulfillment</span>
                <span className="font-bold text-slate-900">
                  {fulfillmentType === "PICKUP"
                    ? "FREE (Click & Collect)"
                    : deliveryFee === 0
                    ? "FREE (Local Delivery)"
                    : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 pt-3 border-t border-slate-200">
                <span>Grand Total</span>
                <span className="text-green-700">${total.toFixed(2)} AUD</span>
              </div>
            </div>

            <div className="mt-6 p-3.5 bg-white border border-slate-200/80 rounded-2xl text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <ShieldCheck className="h-4 w-4 text-green-700" aria-hidden="true" />
                <span>Fresh Stop Freshness Guarantee</span>
              </div>
              <p>
                Inspected and hand-packed with care before dispatch. Not satisfied with any item? We offer an instant replacement or refund.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
