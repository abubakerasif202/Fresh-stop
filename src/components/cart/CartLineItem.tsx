"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatCents, reasonCopy, type CartLine } from "@/lib/cart-core";

const BTN = "grid h-11 w-11 shrink-0 place-items-center rounded-full text-forest hover:bg-leaf-soft focus-visible:outline-3 focus-visible:outline-citrus";

interface Props {
  line: CartLine;
  /** Called when a link inside the line is followed (lets the drawer close itself). */
  onNavigate?: () => void;
  imageSize?: number;
}

export function CartLineItem({ line, onNavigate, imageSize = 80 }: Props) {
  const { updateQuantity, removeItem, statuses, dismissStatus } = useCart();
  const status = statuses[line.productId];
  const unavailable = status?.kind === "unavailable";

  return (
    <li className={`flex gap-3 py-4 ${unavailable ? "opacity-90" : ""}`}>
      <div className="relative shrink-0 overflow-hidden rounded-xl border border-forest/10 bg-white" style={{ width: imageSize, height: imageSize }}>
        <Image src={line.imageUrl} alt={line.imageAlt || line.name} fill sizes={`${imageSize}px`} className="object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/products/${encodeURIComponent(line.slug)}`} onClick={onNavigate} className="-my-2 block break-words py-2 font-display text-sm font-extrabold leading-tight text-forest hover:underline sm:text-base">
              {line.name}
            </Link>
            <p className="mt-0.5 text-xs text-ink-soft">
              {formatCents(line.priceCents)} / {line.unit}
            </p>
          </div>
          <button type="button" onClick={() => removeItem(line.productId)} className={`${BTN} -mr-2 -mt-2 text-ink-soft hover:text-brand-red`} aria-label={`Remove ${line.name} from cart`}>
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>

        {status?.kind === "price-changed" && (
          <p role="status" className="flex items-start justify-between gap-2 rounded-lg bg-sun/25 px-2.5 py-1.5 text-xs font-bold text-amber-900">
            <span>
              Price updated: was {formatCents(status.fromCents)}, now {formatCents(status.toCents)}
            </span>
            <button type="button" onClick={() => dismissStatus(line.productId)} className="grid h-6 w-6 shrink-0 place-items-center" aria-label={`Dismiss price update for ${line.name}`}>
              <X size={13} aria-hidden="true" />
            </button>
          </p>
        )}
        {unavailable && (
          <p role="status" className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-bold text-brand-red">
            {reasonCopy(status.reason)}. Remove it to continue.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center rounded-full border border-forest/20 bg-white" role="group" aria-label={`Quantity of ${line.name}`}>
            <button type="button" onClick={() => updateQuantity(line.productId, line.quantity - 1)} className={BTN} aria-label={`Decrease quantity of ${line.name}`}>
              <Minus size={15} aria-hidden="true" />
            </button>
            <span className="w-8 text-center font-display text-sm font-black text-forest" aria-label={`${line.quantity} in cart`}>
              {line.quantity}
            </span>
            <button type="button" onClick={() => updateQuantity(line.productId, line.quantity + 1)} className={BTN} aria-label={`Increase quantity of ${line.name}`}>
              <Plus size={15} aria-hidden="true" />
            </button>
          </div>
          <span className="font-display text-sm font-black text-forest sm:text-base">{formatCents(line.priceCents * line.quantity)}</span>
        </div>
      </div>
    </li>
  );
}
