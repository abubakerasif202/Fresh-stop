"use client";

import { type CartItem, useCartStore } from "@/lib/store/useCartStore";
import { useBranchStore } from "@/lib/store/useBranchStore";
import {
  checkDeliveryEligibility,
  FREE_DELIVERY_THRESHOLD,
  MIN_ORDER_AMOUNT
} from "@/lib/delivery";
import { X, Trash2, Plus, Minus, ArrowRight, Truck, Store, AlertCircle, CheckCircle, ShoppingBasket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

import { useDialogFocus } from "@/lib/useDialogFocus";
import { MAX_ITEM_QUANTITY } from "@/lib/checkout-pricing";

const QTY_BTN =
  "h-11 w-11 rounded-full bg-white border border-forest/20 flex items-center justify-center text-forest hover:bg-leaf-soft transition cursor-pointer focus-visible:outline-3 focus-visible:outline-citrus";

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    fulfillmentType,
    setFulfillmentType,
    deliveryPostcode,
    setDeliveryPostcode,
    getSubtotal,
    addItem
  } = useCartStore();

  const { currentBranch } = useBranchStore();
  const [postcodeInput, setPostcodeInput] = useState("");
  const [removedItem, setRemovedItem] = useState<CartItem | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen && mounted, panelRef, closeCart);
  const removeWithUndo = (item: CartItem) => { setRemovedItem(item); removeItem(item.id); };
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    setPostcodeInput(deliveryPostcode || "");
  }, [deliveryPostcode]);

  if (!mounted) return null;

  const subtotal = getSubtotal();
  const liveDelivery =
    fulfillmentType === "DELIVERY" && deliveryPostcode
      ? checkDeliveryEligibility(deliveryPostcode, subtotal)
      : null;
  const liveFee = liveDelivery?.eligible ? liveDelivery.deliveryFee : 0;
  const total = Number((subtotal + liveFee).toFixed(2));
  const isPostcodeReady = postcodeInput.trim().length === 4;
  const deliveryStatus = isPostcodeReady ? checkDeliveryEligibility(postcodeInput, subtotal) : null;
  const isDelivery = fulfillmentType === "DELIVERY";

  const freeProgress = Math.min(1, subtotal / FREE_DELIVERY_THRESHOLD);
  const toFree = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const toMin = Math.max(0, MIN_ORDER_AMOUNT - subtotal);
  const meetsMin = subtotal >= MIN_ORDER_AMOUNT;

  const handlePostcodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcodeInput) return;
    const res = checkDeliveryEligibility(postcodeInput, subtotal);
    setDeliveryPostcode(postcodeInput, res.deliveryFee);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden ${isOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-ink/50 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        inert={!isOpen}
        className={`absolute inset-y-0 right-0 w-full max-w-md bg-cream shadow-lift flex flex-col transform transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? "translate-x-0" : "translate-x-full invisible"
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-forest/10 flex items-center justify-between bg-white">
          <h2 id="cart-drawer-title" className="font-display text-xl font-black text-forest flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
            Your Basket
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={closeCart}
            className="h-10 w-10 flex items-center justify-center text-ink-soft hover:text-forest hover:bg-leaf-soft rounded-full transition cursor-pointer focus-visible:outline-3 focus-visible:outline-citrus"
            aria-label="Close cart drawer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Fulfilment */}
        <div className="p-4 border-b border-forest/10 bg-white">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft block mb-2">
            Select Fulfillment
          </span>
          <div className="grid grid-cols-2 gap-1 bg-cream-deep p-1 rounded-2xl text-xs font-bold">
            <button
              type="button"
              aria-pressed={!isDelivery}
              onClick={() => setFulfillmentType("PICKUP")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition cursor-pointer focus-visible:outline-3 focus-visible:outline-citrus ${
                !isDelivery ? "bg-forest text-cream shadow-soft" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Store className="h-4 w-4" aria-hidden="true" />
              <span>Click &amp; Collect</span>
            </button>
            <button
              type="button"
              aria-pressed={isDelivery}
              onClick={() => setFulfillmentType("DELIVERY")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition cursor-pointer focus-visible:outline-3 focus-visible:outline-citrus ${
                isDelivery ? "bg-forest text-cream shadow-soft" : "text-ink-soft hover:text-ink"
              }`}
            >
              <Truck className="h-4 w-4" aria-hidden="true" />
              <span>Home Delivery</span>
            </button>
          </div>

          {!isDelivery ? (
            <div className="mt-3 text-xs text-ink bg-leaf-soft p-3 rounded-xl">
              Pick up at: <strong>{currentBranch.name}</strong> ({currentBranch.address}). Choose an available collection window at checkout.
            </div>
          ) : (
            <div className="mt-3">
              <form onSubmit={handlePostcodeCheck} className="flex gap-2">
                <label htmlFor="cart-postcode" className="sr-only">
                  Delivery postcode
                </label>
                <input
                  id="cart-postcode"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  autoComplete="postal-code"
                  placeholder="Sydney postcode (e.g. 2216)"
                  value={postcodeInput}
                  onChange={(e) => setPostcodeInput(e.target.value)}
                  className="flex-1 min-w-0 border border-forest/25 bg-white rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus-visible:outline-3 focus-visible:outline-citrus"
                />
                <button
                  type="submit"
                  className="bg-forest hover:bg-forest-deep text-cream px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer focus-visible:outline-3 focus-visible:outline-citrus"
                >
                  Check
                </button>
              </form>

              <div aria-live="polite">
                {deliveryStatus && (
                  <div
                    className={`mt-2.5 p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                      deliveryStatus.eligible
                        ? "bg-leaf-soft text-forest-deep border-leaf"
                        : "bg-sun/30 text-ink border-sun"
                    }`}
                  >
                    {deliveryStatus.eligible ? (
                      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-forest" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-citrus-deep" aria-hidden="true" />
                    )}
                    <span>{deliveryStatus.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-14 px-4">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-leaf-soft flex items-center justify-center text-forest animate-pop">
                <ShoppingBasket className="h-8 w-8" aria-hidden="true" />
              </div>
              <p className="font-display text-lg font-black text-forest">Your basket is empty</p>
              <p className="text-sm text-ink-soft mt-1">Fresh fruit and veg are one tap away.</p>
              <Link
                href="/products"
                onClick={closeCart}
                className="mt-5 inline-flex items-center gap-2 bg-citrus hover:bg-citrus-deep hover:text-white text-ink font-bold text-sm px-5 py-3 rounded-full transition focus-visible:outline-3 focus-visible:outline-forest"
              >
                Start shopping fresh produce
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-forest/10 shadow-soft"
                >
                  <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-cream-deep shrink-0">
                    <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-ink leading-tight">{item.name}</h3>
                    <p className="text-xs text-ink-soft mt-0.5">
                      ${item.price.toFixed(2)} / {item.unit}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => item.quantity === 1 ? removeWithUndo(item) : updateQuantity(item.id, item.quantity - 1)}
                        className={QTY_BTN}
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <span className="text-sm font-bold text-ink w-6 text-center tabular-nums" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= MAX_ITEM_QUANTITY}
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className={QTY_BTN}
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between self-stretch">
                    <span className="text-sm font-black text-forest tabular-nums">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeWithUndo(item)}
                      className="h-8 w-8 flex items-center justify-center text-ink-soft hover:text-berry-deep hover:bg-berry/10 rounded-full transition cursor-pointer focus-visible:outline-3 focus-visible:outline-citrus"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {removedItem && (
          <div role="status" className="flex items-center justify-between gap-3 bg-sun/40 px-4 py-3 text-sm text-ink">
            <span>{removedItem.name} removed.</span>
            <button type="button" className="min-h-11 shrink-0 font-bold underline" onClick={() => { addItem(removedItem, removedItem.quantity); setRemovedItem(null); }}>Undo</button>
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-forest/10 bg-white space-y-3">
            {isDelivery && (
              <div>
                <p className="text-xs font-semibold text-ink" aria-live="polite">
                  {!meetsMin
                    ? `Add $${toMin.toFixed(2)} to reach the $${MIN_ORDER_AMOUNT.toFixed(2)} delivery minimum.`
                    : toFree > 0
                    ? `Add $${toFree.toFixed(2)} more for free delivery.`
                    : "You've unlocked free delivery!"}
                </p>
                <div
                  className="mt-1.5 h-2.5 w-full rounded-full bg-cream-deep overflow-hidden"
                  role="progressbar"
                  aria-label="Progress to free delivery"
                  aria-valuemin={0}
                  aria-valuemax={FREE_DELIVERY_THRESHOLD}
                  aria-valuenow={Math.min(subtotal, FREE_DELIVERY_THRESHOLD)}
                >
                  <div
                    className={`h-full w-full origin-left rounded-full transition-transform duration-500 ease-out motion-reduce:transition-none ${
                      freeProgress >= 1 ? "bg-forest" : "bg-leaf"
                    }`}
                    style={{ transform: `scaleX(${freeProgress})` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-sm text-ink-soft">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-ink tabular-nums">${subtotal.toFixed(2)}</span>
              </div>
              {isDelivery && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {!deliveryPostcode
                      ? "Enter postcode"
                      : !liveDelivery?.eligible
                      ? "Not available"
                      : liveFee === 0
                      ? "FREE"
                      : `$${liveFee.toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-forest pt-2 border-t border-forest/10">
                <span>Total</span>
                <span className="tabular-nums">${total.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full bg-citrus hover:bg-citrus-deep hover:text-white text-ink font-black py-3.5 px-4 rounded-full flex items-center justify-center gap-2 shadow-soft text-sm transition focus-visible:outline-3 focus-visible:outline-forest"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
