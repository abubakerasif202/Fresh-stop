"use client";

import { useState } from "react";
import { Plus, Minus, ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { EnquiryButton } from "@/components/enquiry/EnquiryButton";

interface AddToCartButtonProps {
  productId: string;
  slug: string;
  name: string;
  price: number | null;
  priceCents: number | null;
  unit: string | null;
  imageUrl: string;
  imageAlt?: string | null;
  taxCategory?: "GST_FREE" | "TAXABLE_10";
  isPurchasable?: boolean;
  large?: boolean;
}

export function AddToCartButton({
  productId,
  slug,
  name,
  price,
  priceCents,
  unit,
  imageUrl,
  imageAlt,
  taxCategory = "GST_FREE",
  isPurchasable = true,
  large = false
}: AddToCartButtonProps) {
  const { items, addItem, updateQuantity } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  // If price is missing or not purchasable, fallback to enquiry
  if (!isPurchasable || price === null || price === undefined || price <= 0) {
    return <EnquiryButton name={name} imageUrl={imageUrl} large={large} />;
  }

  const cents = priceCents ?? Math.round(price * 100);
  const cartItem = items.find((i) => i.productId === productId || i.slug === slug);
  const currentQty = cartItem?.quantity ?? 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId,
      slug,
      name,
      price,
      priceCents: cents,
      unit: unit || "each",
      imageUrl,
      imageAlt,
      taxCategory
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(productId, currentQty + 1);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(productId, currentQty - 1);
  };

  if (currentQty > 0) {
    return (
      <div
        className={`flex items-center justify-between rounded-full border border-forest/30 bg-white ${
          large ? "h-12 max-w-xs px-2" : "h-10 w-full px-1.5"
        }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={handleDecrease}
          className="grid h-8 w-8 place-items-center rounded-full text-forest hover:bg-leaf-soft transition active:scale-95"
          aria-label={`Decrease ${name} quantity`}
        >
          <Minus size={15} />
        </button>
        <div className="flex flex-col items-center justify-center">
          <span className="font-display font-black text-forest text-sm">{currentQty} in cart</span>
        </div>
        <button
          type="button"
          onClick={handleIncrease}
          className="grid h-8 w-8 place-items-center rounded-full text-forest hover:bg-leaf-soft transition active:scale-95"
          aria-label={`Increase ${name} quantity`}
        >
          <Plus size={15} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={`group relative flex w-full items-center justify-center gap-2 rounded-full font-display font-black transition active:scale-98 ${
        large
          ? "button button-red h-13 px-8 text-base shadow-soft hover:shadow-lift"
          : "h-10 bg-forest text-cream hover:bg-deep-green text-xs sm:text-sm px-4"
      }`}
      aria-label={`Add ${name} to cart for $${price.toFixed(2)}`}
    >
      {justAdded ? (
        <>
          <Check size={large ? 20 : 16} className="text-lime" aria-hidden="true" />
          <span>Added to Basket</span>
        </>
      ) : (
        <>
          <ShoppingBag size={large ? 19 : 15} aria-hidden="true" />
          <span>Add to Cart</span>
        </>
      )}
    </button>
  );
}
