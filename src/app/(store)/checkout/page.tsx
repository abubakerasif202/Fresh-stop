"use client";

import { useCartStore, type CartItem } from "@/lib/store/useCartStore";
import { useBranchStore } from "@/lib/store/useBranchStore";
import { useHydratedStore } from "@/lib/store/useHydratedStore";
import { checkDeliveryEligibility } from "@/lib/delivery";
import { getCheckoutAttempt, clearCheckoutAttempt } from "@/lib/checkout-attempt";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { STORE_HOURS_TEXT, type PickupSlot } from "@/lib/pickup-slots";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Store, Truck, CreditCard, Banknote, ShieldCheck, ShoppingBasket, ArrowLeft, CheckCircle2, AlertCircle, Lock } from "lucide-react";

const EMPTY_ITEMS: CartItem[] = [];

const FIELD =
  "w-full border border-forest/25 rounded-xl px-3.5 py-3 text-sm bg-white text-ink placeholder:text-ink-soft focus-visible:outline-3 focus-visible:outline-citrus focus-visible:border-forest";
const LABEL = "block text-sm font-bold text-ink mb-1.5";
const CARD = "bg-white border border-forest/10 rounded-3xl p-5 sm:p-6 shadow-soft";
const STEP = "w-7 h-7 rounded-full bg-forest text-cream text-xs flex items-center justify-center font-black";

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
  const [deliveryPostcode, setDeliveryPostcode] = useState("");
  const [pickupTimeslot, setPickupTimeslot] = useState("");
  const [slots, setSlots] = useState<PickupSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [paymentMethod] = useState<"PAY_ON_PICKUP" | "STRIPE">("PAY_ON_PICKUP");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const submittingRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const openBranchSelector = useBranchStore((state) => state.openModal);

  useEffect(() => { if (errorMsg) errorRef.current?.focus(); }, [errorMsg]);

  // Sync savedPostcode once hydrated from store
  useEffect(() => {
    if (savedPostcode && savedPostcode.trim()) {
      setDeliveryPostcode(savedPostcode.trim());
    }
  }, [savedPostcode]);

  const loadSlots = useCallback(async () => {
    try {
      const res = await fetch("/api/pickup-slots", { cache: "no-store" });
      if (!res.ok) throw new Error("slots");
      const data = (await res.json()) as { slots?: PickupSlot[] };
      const next = Array.isArray(data.slots) ? data.slots : [];
      setSlots(next);
      setSlotsError(false);
      setPickupTimeslot((cur) => (next.some((s) => s.value === cur) ? cur : next[0]?.value ?? ""));
    } catch {
      setSlotsError(true);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
    const onFocus = () => void loadSlots();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadSlots]);

  const slotGroups = useMemo(() => {
    const groups: { day: string; slots: PickupSlot[] }[] = [];
    for (const s of slots) {
      const last = groups[groups.length - 1];
      if (last && last.day === s.dayLabel) last.slots.push(s);
      else groups.push({ day: s.dayLabel, slots: [s] });
    }
    return groups;
  }, [slots]);

  const items = hydratedItems ?? EMPTY_ITEMS;

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
    if (submittingRef.current) return;
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

    if (fulfillmentType !== "DELIVERY" && !pickupTimeslot) {
      setErrorMsg("Please choose an available pickup time.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = JSON.stringify({
        fulfillmentType,
        branchSlug: currentBranch?.slug || "rockdale",
        customerName: customerName.trim(), customerEmail: customerEmail.trim(), customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(), deliveryPostcode: deliveryPostcode.trim(), deliveryNotes, pickupTimeslot,
        items: items.map(({ id, quantity }) => ({ id, quantity })), paymentMethod
      });
      const attempt = await getCheckoutAttempt(payload);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.key },
        body: payload
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && fulfillmentType !== "DELIVERY") void loadSlots();
        throw new Error(
          res.status === 429
            ? data.error || "Too many order attempts. Please wait a few minutes and try again."
            : data.error || "Failed to process order. Please try again."
        );
      }

      if (typeof data.orderId !== "string" || typeof data.confirmationToken !== "string" || !data.confirmationToken) {
        throw new Error("We could not confirm your order. Please retry with the same details.");
      }
      clearCheckoutAttempt(attempt);
      clearCart();
      const token = typeof data.confirmationToken === "string" ? data.confirmationToken : "";
      router.push(`/order-confirmation/${data.orderId}${token ? `?t=${encodeURIComponent(token)}` : ""}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Hydration skeleton to eliminate empty cart flash
  if (hydratedItems === undefined) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse min-h-screen">
        <div className="h-8 bg-cream-deep rounded-xl w-64 mb-3"></div>
        <div className="h-4 bg-cream-deep rounded-lg w-96 max-w-full mb-8"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-cream-deep rounded-3xl"></div>
          <div className="lg:col-span-5 h-80 bg-cream-deep/60 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  // Actual empty cart state
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center min-h-screen">
        <div className="w-20 h-20 bg-leaf-soft rounded-full flex items-center justify-center mx-auto mb-5 text-forest animate-pop">
          <ShoppingBasket className="h-9 w-9" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-black text-forest mb-2">Your basket is empty</h1>
        <p className="text-sm text-ink-soft mb-7 max-w-md mx-auto">
          Explore our seasonal fruit boxes, organic vegetables, and weekly specials to start building your order.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-6 py-3.5 bg-citrus hover:bg-citrus-deep hover:text-white text-ink rounded-full text-sm font-black shadow-soft transition focus-visible:outline-3 focus-visible:outline-forest"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Browse Fresh Produce</span>
        </Link>
      </div>
    );
  }

  const isDelivery = fulfillmentType === "DELIVERY";
  const deliveryOk = !!deliveryCheck && deliveryCheck.eligible && deliveryCheck.meetsMinimumSpend;

  const optionClass = (active: boolean) =>
    `flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition cursor-pointer focus-visible:outline-3 focus-visible:outline-citrus ${
      active ? "border-forest bg-leaf-soft/60 shadow-soft" : "border-forest/15 bg-white hover:border-forest/40"
    }`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 pb-28 sm:py-12 lg:pb-12">
      <div className="mb-8 flex items-start gap-4">
        <BrandLogo size={56} />
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-forest transition mb-1.5 focus-visible:outline-3 focus-visible:outline-citrus"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Continue Shopping</span>
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-black text-forest tracking-tight">Checkout</h1>
          <p className="text-sm text-ink-soft mt-1">
            Choose Click &amp; Collect or Sydney delivery, then place your order.
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-forest/15 bg-cream px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift lg:hidden">
        <div><span className="block text-xs text-ink-soft">Order total</span><strong className="text-lg text-forest tabular-nums">${total.toFixed(2)}</strong></div>
        <button type="submit" form="checkout-form" disabled={isSubmitting} className="min-h-11 rounded-full bg-forest px-5 text-sm font-bold text-white disabled:opacity-60">{isSubmitting ? "Placing order…" : "Place order"}</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Form */}
        <form id="checkout-form" aria-busy={isSubmitting} onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          <div aria-live="assertive">
            {errorMsg && (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="p-4 bg-berry/10 border border-berry text-berry-deep text-sm rounded-2xl font-semibold flex items-start gap-2.5"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* 1. Fulfillment */}
          <section className={CARD} aria-labelledby="step-fulfilment">
            <h2 id="step-fulfilment" className="font-display text-lg font-black text-forest mb-4 flex items-center gap-2.5">
              <span className={STEP}>1</span>
              <span>How would you like it?</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                aria-pressed={fulfillmentType === "PICKUP"}
                onClick={() => setFulfillmentType("PICKUP")}
                className={optionClass(fulfillmentType === "PICKUP")}
              >
                <Store className="h-5 w-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-sm font-black text-ink">Click &amp; Collect</span>
                  <span className="block text-xs text-ink-soft mt-0.5">
                    Pick up at {currentBranch?.name || "Rockdale"}
                  </span>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-leaf text-ink">
                    FREE
                  </span>
                </div>
              </button>

              <button
                type="button"
                aria-pressed={fulfillmentType === "DELIVERY"}
                onClick={() => setFulfillmentType("DELIVERY")}
                className={optionClass(fulfillmentType === "DELIVERY")}
              >
                <Truck className="h-5 w-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="block text-sm font-black text-ink">Sydney Home Delivery</span>
                  <span className="block text-xs text-ink-soft mt-0.5">Dispatched to your door</span>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sun text-ink">
                    From $9.99 · Free over $150
                  </span>
                </div>
              </button>
            </div>

            {!isDelivery ? (
              <div className="pt-4 border-t border-forest/10 space-y-4">
                <div className="bg-cream-deep p-4 rounded-2xl text-sm text-ink">
                  <strong className="block text-forest mb-0.5">
                    Pickup location: {currentBranch?.name || "Fresh Stop Rockdale"}
                  </strong>
                  <span className="text-ink-soft">
                    {currentBranch?.address || "Shop 1, 2-4 King Street"}, {currentBranch?.suburb || "Rockdale"} NSW{" "}
                    {currentBranch?.postcode || "2216"}
                  </span>
                </div>

                <button type="button" onClick={openBranchSelector} className="min-h-11 text-sm font-bold text-forest underline">Change pickup store</button>
                <div>
                  <label htmlFor="timeslot" className={LABEL}>
                    Preferred collection window
                  </label>
                  {slotsLoading ? (
                    <p className="text-sm text-ink-soft" aria-live="polite">Loading pickup times...</p>
                  ) : slotsError ? (
                    <p className="text-sm text-berry-deep" role="alert">
                      Couldn&apos;t load pickup times.{" "}
                      <button type="button" onClick={() => void loadSlots()} className="underline font-bold">
                        Try again
                      </button>
                    </p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-ink" aria-live="polite">
                      No pickup times left — see store hours: {STORE_HOURS_TEXT}.
                    </p>
                  ) : (
                    <select
                      id="timeslot"
                      value={pickupTimeslot}
                      onChange={(e) => setPickupTimeslot(e.target.value)}
                      className={FIELD}
                    >
                      {slotGroups.map((g) => (
                        <optgroup key={g.day} label={g.day}>
                          {g.slots.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label.replace(" - ", " – ")}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t border-forest/10 space-y-4">
                <div>
                  <label htmlFor="address" className={LABEL}>
                    Street address <span className="text-berry-deep" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="address"
                    type="text"
                    required
                    autoComplete="street-address"
                    placeholder="e.g. 15 Forest Rd, Apt 4"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="postcode" className={LABEL}>
                    Sydney postcode <span className="text-berry-deep" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="postcode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    required
                    maxLength={4}
                    pattern="[0-9]{4}"
                    placeholder="e.g. 2216 or 2210"
                    value={deliveryPostcode}
                    onChange={(e) => setDeliveryPostcode(e.target.value)}
                    aria-describedby="delivery-status"
                    className={FIELD}
                  />
                </div>

                <div id="delivery-status" aria-live="polite">
                  {deliveryCheck && (
                    <div
                      className={`p-3.5 rounded-2xl border text-sm flex items-start gap-2.5 ${
                        deliveryOk
                          ? "bg-leaf-soft border-leaf text-forest-deep"
                          : "bg-sun/30 border-sun text-ink"
                      }`}
                    >
                      {deliveryOk ? (
                        <CheckCircle2 className="h-5 w-5 text-forest shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-citrus-deep shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <div>
                        <strong className="block font-bold">
                          {deliveryCheck.eligible ? deliveryCheck.zoneName : "Outside standard delivery corridor"}
                        </strong>
                        <span className="text-xs block mt-0.5">{deliveryCheck.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 2. Contact */}
          <section className={`${CARD} space-y-4`} aria-labelledby="step-contact">
            <h2 id="step-contact" className="font-display text-lg font-black text-forest flex items-center gap-2.5">
              <span className={STEP}>2</span>
              <span>Your details</span>
            </h2>

            <div>
              <label htmlFor="fullname" className={LABEL}>
                Full name <span className="text-berry-deep" aria-hidden="true">*</span>
              </label>
              <input
                id="fullname"
                type="text"
                required
                autoComplete="name"
                minLength={2}
                maxLength={120}
                placeholder="e.g. Sarah Jenkins"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={FIELD}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className={LABEL}>
                  Email address <span className="text-berry-deep" aria-hidden="true">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={FIELD}
                />
              </div>

              <div>
                <label htmlFor="phone" className={LABEL}>
                  Mobile phone <span className="text-berry-deep" aria-hidden="true">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  minLength={8}
                  maxLength={24}
                  placeholder="0400 000 000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={FIELD}
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className={LABEL}>
                Delivery instructions or notes (optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                maxLength={1000}
                placeholder="Gate code, leave by side door, or special produce requests..."
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                className={FIELD}
              />
            </div>
          </section>

          {/* 3. Payment */}
          <section className={CARD} aria-labelledby="step-payment">
            <h2 id="step-payment" className="font-display text-lg font-black text-forest mb-4 flex items-center gap-2.5">
              <span className={STEP}>3</span>
              <span>Payment</span>
            </h2>

            <div role="radiogroup" aria-labelledby="step-payment" className="space-y-3">
              <label className="flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer transition border-forest bg-leaf-soft/60 focus-within:outline-3 focus-within:outline-citrus">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="PAY_ON_PICKUP"
                  checked={paymentMethod === "PAY_ON_PICKUP"}
                  readOnly
                  className="mt-1 h-4 w-4 accent-forest"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-black text-ink">
                    <Banknote className="h-4 w-4 text-forest" aria-hidden="true" />
                    <span>{isDelivery ? "Pay on delivery" : "Pay at pickup"}</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">
                    Pay in store at collection by cash or card terminal, or by EFTPOS when your delivery arrives.
                    Nothing is charged online.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border-2 border-forest/10 rounded-2xl bg-cream-deep/50 cursor-not-allowed opacity-80">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="STRIPE"
                  disabled
                  checked={false}
                  readOnly
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-black text-ink-soft">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    <span>Credit / debit card</span>
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sun text-ink">
                      Coming soon
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">
                    Card payments aren&apos;t available online yet — pay at pickup / on delivery.
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* CTA */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-citrus hover:bg-citrus-deep hover:text-white disabled:opacity-60 disabled:cursor-not-allowed text-ink font-black py-4 rounded-full shadow-lift transition text-base flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-3 focus-visible:outline-forest"
          >
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <span>
              {isSubmitting ? "Placing your order..." : `Place order — $${total.toFixed(2)} AUD`}
            </span>
          </button>
          <p className="text-center text-xs text-ink-soft flex items-center justify-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>No payment is taken online. You pay when you collect or receive your order.</span>
          </p>
        </form>

        {/* Summary */}
        <aside className="lg:col-span-5" aria-label="Order Summary">
          <div className="bg-white border border-forest/10 rounded-3xl p-5 sm:p-6 shadow-lift lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-black text-forest mb-4">Your basket</h2>

            <ul className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-5">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-cream-deep shrink-0">
                    <Image src={it.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-ink truncate">{it.name}</p>
                    <p className="text-xs text-ink-soft">
                      ${it.price.toFixed(2)} / {it.unit} × {it.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-ink shrink-0 tabular-nums">
                    ${(it.price * it.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-forest/10 space-y-2 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>Produce subtotal</span>
                <span className="font-bold text-ink tabular-nums">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>{isDelivery ? "Delivery" : "Click & Collect"}</span>
                <span className="font-bold text-ink tabular-nums">
                  {!isDelivery ? "FREE" : !deliveryCheck?.eligible ? "Enter eligible postcode" : deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between items-baseline text-lg font-black text-forest pt-3 border-t border-forest/10">
                <span>Total</span>
                <span className="tabular-nums">${total.toFixed(2)} AUD</span>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-cream rounded-2xl text-xs text-ink-soft space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-ink">
                <ShieldCheck className="h-4 w-4 text-forest" aria-hidden="true" />
                <span>Fresh from our stores</span>
              </div>
              <p>
                {isDelivery ? `Your delivery is assigned by postcode${deliveryCheck?.assignedBranch ? ` to ${deliveryCheck.assignedBranch === "rockdale" ? "Rockdale" : "Riverwood"}` : ""}.` : "Your order is prepared at the pickup store you selected."}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
