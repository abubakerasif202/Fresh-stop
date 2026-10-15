"use client";
import { useEffect, useState } from "react";
import { useCartStore } from "@/lib/store/useCartStore";
import { useBranchStore } from "@/lib/store/useBranchStore";
import { QuantityStepper } from "./QuantityStepper";
import { WishlistButton } from "./ShoppingMemory";
import { MAX_ITEM_QUANTITY } from "@/lib/checkout-pricing";

export function ProductPurchase({ product, availableBranches }: {
  product: { id: string; slug: string; name: string; price: number; unit: string; imageUrl: string };
  availableBranches: string[];
}) {
  const branch = useBranchStore((s) => s.currentBranch);
  const openBranches = useBranchStore((s) => s.openModal);
  const add = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [ready, setReady] = useState(false);
  const [added, setAdded] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => { if (added) { const timer = setTimeout(() => setAdded(false), 1800); return () => clearTimeout(timer); } }, [added]);
  const available = ready && availableBranches.includes(branch.slug);
  return <div className="mt-6 space-y-4">
    <p className="text-sm font-semibold">{ready ? `${available ? "Available" : "Unavailable"} at ${branch.name}` : "Checking your selected store…"}</p>
    <button type="button" onClick={openBranches} className="text-sm font-semibold text-forest underline underline-offset-4">Change store</button>
    <div className="flex flex-wrap items-center gap-3">
      <QuantityStepper name={product.name} quantity={quantity} onChange={(q) => setQuantity(Math.min(MAX_ITEM_QUANTITY, Math.max(1, q)))} />
      <button type="button" disabled={!available} onClick={() => { add(product, quantity); setAdded(true); }} className="min-h-12 rounded-full bg-forest px-7 py-3 font-bold text-white transition hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-50">{added ? "Added to your basket" : "Add to basket"}</button>
      <WishlistButton slug={product.slug} name={product.name} />
    </div>
    <p role="status" className="min-h-5 text-sm text-forest">{added ? `${quantity} × ${product.name} added.` : ""}</p>
  </div>;
}
