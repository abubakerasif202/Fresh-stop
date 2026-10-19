"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Minus, Trash2, ArrowRight, ArrowLeft, ShoppingBag, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { MIN_ORDER_AMOUNT, FREE_DELIVERY_THRESHOLD } from "@/types/cart";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, totals } = useCart();

  const toFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - totals.subtotal);
  const freeDeliveryPercent = Math.min(100, Math.round((totals.subtotal / FREE_DELIVERY_THRESHOLD) * 100));
  const canCheckout = totals.subtotal >= MIN_ORDER_AMOUNT;
  const toMinOrder = Math.max(0, MIN_ORDER_AMOUNT - totals.subtotal);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-leaf-soft text-forest">
          <ShoppingBag size={44} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-black text-forest sm:text-4xl">
          Your shopping cart is empty
        </h1>
        <p className="mt-3 text-base text-ink-soft max-w-md mx-auto">
          Explore our fresh Sydney produce, seasonal boxes, grains, dairy, and pantry essentials.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/products" className="button button-green">
            Explore All Products <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link
            href="/products"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:underline"
          >
            <ArrowLeft size={14} /> Continue Shopping
          </Link>
          <h1 className="font-display text-3xl font-black tracking-tight text-forest sm:text-4xl">
            Shopping Cart
          </h1>
          <p className="text-sm text-ink-soft">
            {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"} in your fresh order
          </p>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs font-bold text-ink-soft hover:text-brand-red self-start sm:self-auto"
        >
          Clear entire cart
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Items Table */}
        <div className="lg:col-span-8">
          {/* Free Delivery Banner */}
          <div className="mb-6 rounded-2xl border border-forest/10 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 text-sm font-bold text-forest">
              <Truck size={18} className="text-deep-green" />
              {toFreeDelivery > 0 ? (
                <span>
                  Spend <strong className="text-brand-red">${toFreeDelivery.toFixed(2)}</strong> more for{" "}
                  <strong>FREE Sydney delivery</strong>!
                </span>
              ) : (
                <span className="text-deep-green font-extrabold">🎉 You unlocked FREE Sydney delivery!</span>
              )}
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-cream-deep">
              <div
                className="h-full bg-deep-green transition-all duration-300"
                style={{ width: `${freeDeliveryPercent}%` }}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-soft">
            <ul className="divide-y divide-forest/10" role="list">
              {items.map((item) => (
                <li key={item.productId} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="relative aspect-square h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-forest/10 bg-cream">
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt || item.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between sm:flex-row sm:items-center sm:gap-6 min-w-0">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.slug}`}
                        className="font-display font-extrabold text-forest text-base sm:text-lg hover:underline line-clamp-1"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        ${item.price.toFixed(2)} / {item.unit}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-leaf-soft px-2 py-0.5 text-[10px] font-bold text-forest">
                        {item.taxCategory === "GST_FREE" ? "GST-free" : "Includes 10% GST"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between sm:mt-0 sm:gap-6">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-full border border-forest/20 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="grid h-8 w-8 place-items-center rounded-full text-forest hover:bg-leaf-soft"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center font-display font-black text-forest text-sm">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="grid h-8 w-8 place-items-center rounded-full text-forest hover:bg-leaf-soft"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Line Total */}
                      <div className="text-right sm:min-w-24">
                        <span className="font-display text-lg font-black text-forest">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="text-ink-soft hover:text-brand-red p-1.5 transition"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-xl font-black text-forest">Order Summary</h2>

            <div className="mt-5 space-y-3 border-b border-forest/10 pb-5 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal ({totals.itemCount} items)</span>
                <span className="font-bold text-ink">${totals.subtotal.toFixed(2)} AUD</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Estimated Delivery</span>
                <span className="font-bold text-ink">
                  {totals.deliveryFee === 0 ? (
                    <span className="text-deep-green font-extrabold">FREE</span>
                  ) : (
                    `$${totals.deliveryFee.toFixed(2)} AUD`
                  )}
                </span>
              </div>
              {totals.gstTotal > 0 && (
                <div className="flex justify-between text-xs text-ink-soft">
                  <span>Included Australian GST</span>
                  <span>${totals.gstTotal.toFixed(2)} AUD</span>
                </div>
              )}
            </div>

            <div className="py-4">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-lg font-black text-forest">Total (AUD)</span>
                <span className="font-display text-2xl font-black text-forest">
                  ${totals.total.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-soft">
                Final delivery eligibility verified during checkout based on your Sydney postcode.
              </p>
            </div>

            {!canCheckout && (
              <div className="mb-4 rounded-xl bg-sun/20 p-3 text-xs font-bold text-amber-900">
                Minimum order amount is ${MIN_ORDER_AMOUNT.toFixed(2)}. Please add ${toMinOrder.toFixed(2)} more to proceed.
              </div>
            )}

            <Link
              href="/checkout"
              className={`button ${
                canCheckout ? "button-red" : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
              } w-full justify-center py-4 text-center text-base`}
              aria-disabled={!canCheckout}
              onClick={(e) => {
                if (!canCheckout) e.preventDefault();
              }}
            >
              Proceed to Checkout <ArrowRight size={18} />
            </Link>

            <div className="mt-6 space-y-2 border-t border-forest/10 pt-4 text-xs text-ink-soft">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-deep-green" />
                <span>Secure Stripe Checkout (Cards, Apple Pay, Google Pay)</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-forest" />
                <span>Delivered fresh across Sydney Metro</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
