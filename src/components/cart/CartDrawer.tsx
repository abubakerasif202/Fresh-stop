"use client";

import { useCartStore } from "@/lib/store/useCartStore";
import { useBranchStore } from "@/lib/store/useBranchStore";
import { checkDeliveryEligibility } from "@/lib/delivery";
import { X, Trash2, Plus, Minus, ArrowRight, Truck, Store, AlertCircle, CheckCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

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
    getTotal,
    deliveryFee
  } = useCartStore();

  const { currentBranch } = useBranchStore();
  const [postcodeInput, setPostcodeInput] = useState("");

  useEffect(() => {
    setMounted(true);
    setPostcodeInput(deliveryPostcode || "");
  }, [deliveryPostcode]);

  if (!mounted || !isOpen) return null;

  const subtotal = getSubtotal();
  const total = getTotal();
  const deliveryStatus = postcodeInput ? checkDeliveryEligibility(postcodeInput, subtotal) : null;

  const handlePostcodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postcodeInput) return;
    const res = checkDeliveryEligibility(postcodeInput, subtotal);
    setDeliveryPostcode(postcodeInput, res.deliveryFee);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h2 className="text-lg font-black text-slate-900">Your Basket</h2>
            <button
              onClick={closeCart}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              aria-label="Close cart drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Fulfillment Toggle */}
          <div className="p-4 border-b border-slate-100 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Fulfillment
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFulfillmentType("PICKUP")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                  fulfillmentType === "PICKUP"
                    ? "bg-white text-green-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                <span>Click & Collect</span>
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType("DELIVERY")}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                  fulfillmentType === "DELIVERY"
                    ? "bg-white text-green-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Home Delivery</span>
              </button>
            </div>

            {fulfillmentType === "PICKUP" ? (
              <div className="mt-2.5 text-xs text-slate-600 bg-green-50/50 p-2.5 rounded-lg border border-green-100">
                Pick up at: <strong>{currentBranch.name}</strong> ({currentBranch.address}). Ready in 2 hours.
              </div>
            ) : (
              <div className="mt-3">
                <form onSubmit={handlePostcodeCheck} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Sydney Postcode (e.g. 2216)"
                    value={postcodeInput}
                    onChange={(e) => setPostcodeInput(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-hidden focus:border-green-600"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Check
                  </button>
                </form>

                {deliveryStatus && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                      deliveryStatus.eligible
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {deliveryStatus.eligible ? (
                      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    )}
                    <span>{deliveryStatus.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm">Your basket is currently empty.</p>
                <button
                  type="button"
                  onClick={closeCart}
                  className="mt-4 text-xs font-bold text-green-700 hover:underline cursor-pointer"
                >
                  Start shopping fresh produce →
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60"
                >
                  <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-white shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      ${item.price.toFixed(2)} / {item.unit}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 block">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-600 mt-2 p-1 transition cursor-pointer"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                {fulfillmentType === "DELIVERY" && (
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-semibold text-slate-900">
                      {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total (Inc. GST)</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                onClick={closeCart}
                className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm text-sm transition"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
