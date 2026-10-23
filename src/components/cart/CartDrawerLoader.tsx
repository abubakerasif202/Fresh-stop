"use client";

import dynamic from "next/dynamic";
import { useCart } from "@/context/CartContext";

/** The drawer UI is only needed after the shopper opens the cart, so its code stays out of the initial load. */
const CartDrawer = dynamic(() => import("./CartDrawer").then((module) => module.CartDrawer), { ssr: false });

export function CartDrawerLoader() {
  const { isOpen } = useCart();
  return isOpen ? <CartDrawer /> : null;
}
