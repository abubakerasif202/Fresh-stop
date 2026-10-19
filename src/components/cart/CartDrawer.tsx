"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { MIN_ORDER_AMOUNT, FREE_DELIVERY_THRESHOLD } from "@/types/cart";

export function CartDrawer() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, totals } = useCart();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeCart]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - totals.subtotal);
  const freeDeliveryPercent = Math.min(100, Math.round((totals.subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const canCheckout = totals.subtotal >= MIN_ORDER_AMOUNT;
  const toMinOrder = Math.max(0, MIN_ORDER_AMOUNT - totals.subtotal);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Shopping Cart">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-forest/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          className="flex w-screen max-w-md flex-col bg-cream shadow-2xl transition duration-300 ease-in-out"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-forest" size={22} aria-hidden="true" />
              <h2 className="font-display text-xl font-black text-forest">Your Fresh Basket</h2>
              <span className="rounded-full bg-leaf-soft px-2.5 py-0.5 text-xs font-bold text-forest">
                {totals.itemCount}
              </span>
            </div>
            <button
              type="button"
              onClick={closeCart}
              className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-forest/10 hover:text-forest"
              aria-label="Close cart"
            >
              <X size={20} />
            </button>
          </div>

          {/* Free Delivery Bar */}
          <div className="border-b border-forest/10 bg-white px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-forest">
              <Truck size={15} className="text-deep-green" />
              {toFreeDelivery > 0 ? (
                <span>
                  Add <strong className="text-brand-red">${toFreeDelivery.toFixed(2)}</strong> more for FREE Sydney delivery!
                </span>
              ) : (
                <span className="text-deep-green font-extrabold">🎉 You unlocked FREE Sydney delivery!</span>
              )}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-cream-deep">
              <div
                className="h-full bg-deep-green transition-all duration-300"
                style={{ width: `${freeDeliveryPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-leaf-soft text-forest">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="mt-4 font-display text-lg font-black text-forest">Your basket is empty</h3>
                <p className="mt-2 text-sm text-ink-soft max-w-xs">
                  Explore our farm-fresh produce and Sydney groceries to fill up your kitchen.
                </p>
                <Link
                  href="/products"
                  onClick={closeCart}
                  className="button button-green mt-6"
                >
                  Start Shopping <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-forest/10" role="list">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-4 py-4">
                    <div className="relative aspect-square h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-forest/10 bg-white">
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt || item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={closeCart}
                            className="font-display font-extrabold text-forest text-sm sm:text-base leading-tight hover:underline line-clamp-1"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="text-ink-soft hover:text-brand-red transition p-1"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-ink-soft mt-0.5">
                          ${item.price.toFixed(2)} / {item.unit}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        {/* Stepper */}
                        <div className="flex items-center rounded-full border border-forest/20 bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="grid h-7 w-7 place-items-center rounded-full text-forest hover:bg-leaf-soft"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <span className="w-8 text-center text-xs font-black text-forest">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="grid h-7 w-7 place-items-center rounded-full text-forest hover:bg-leaf-soft"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <span className="font-display font-black text-forest text-sm sm:text-base">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer Summary */}
          {items.length > 0 && (
            <div className="border-t border-forest/15 bg-white p-5">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <span>Subtotal</span>
                  <span className="font-bold text-ink">${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-soft">
                  <span>Estimated Delivery</span>
                  <span className="font-bold text-ink">
                    {totals.deliveryFee === 0 ? "FREE" : `$${totals.deliveryFee.toFixed(2)}`}
                  </span>
                </div>
                {totals.gstTotal > 0 && (
                  <div className="flex justify-between text-xs text-ink-soft">
                    <span>Includes GST</span>
                    <span>${totals.gstTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-forest/10 pt-2 text-base font-black text-forest">
                  <span>Estimated Total</span>
                  <span>${totals.total.toFixed(2)} AUD</span>
                </div>
              </div>

              {!canCheckout && (
                <div className="mt-3 rounded-lg bg-sun/20 p-2.5 text-xs font-bold text-amber-900">
                  Minimum online order is ${MIN_ORDER_AMOUNT.toFixed(2)}. Add ${toMinOrder.toFixed(2)} more to checkout.
                </div>
              )}

              <div className="mt-4 grid gap-2">
                <Link
                  href="/checkout"
                  onClick={(e) => {
                    if (!canCheckout) e.preventDefault();
                    else closeCart();
                  }}
                  className={`button ${
                    canCheckout ? "button-red" : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  } w-full justify-center text-center`}
                  aria-disabled={!canCheckout}
                >
                  Proceed to Checkout <ArrowRight size={17} />
                </Link>
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="button button-outline text-forest w-full justify-center text-center text-xs"
                >
                  View Full Cart Details
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
