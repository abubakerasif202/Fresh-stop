"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import type { CartItem, CartTotals } from "@/types/cart";
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from "@/types/cart";

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  totals: CartTotals;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = "fresh_stop_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Fallback to empty if corrupted
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage whenever items change (after initial hydration)
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage quota or private browsing
    }
  }, [items, isHydrated]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    if (quantity <= 0) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId || i.slug === item.slug);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId || i.slug === item.slug
            ? { ...i, quantity: Math.min(i.quantity + quantity, 99) }
            : i
        );
      }
      return [...prev, { ...item, quantity: Math.min(quantity, 99) }];
    });
    setIsOpen(true);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId && i.slug !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId || i.slug === productId
          ? { ...i, quantity: Math.min(quantity, 99) }
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totals = useMemo<CartTotals>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    const subtotal = Number((subtotalCents / 100).toFixed(2));

    // Australian GST calculation: Basic grocery items are GST_FREE.
    // For TAXABLE_10 items, Australian retail price includes GST (1/11th).
    let gstTotalCents = 0;
    for (const item of items) {
      if (item.taxCategory === "TAXABLE_10") {
        const lineCents = item.priceCents * item.quantity;
        gstTotalCents += Math.round(lineCents / 11);
      }
    }
    const gstTotal = Number((gstTotalCents / 100).toFixed(2));

    const deliveryFeeCents =
      subtotalCents === 0 || subtotal >= FREE_DELIVERY_THRESHOLD
        ? 0
        : Math.round(STANDARD_DELIVERY_FEE * 100);
    const deliveryFee = Number((deliveryFeeCents / 100).toFixed(2));

    const totalCents = subtotalCents + deliveryFeeCents;
    const total = Number((totalCents / 100).toFixed(2));

    return {
      itemCount,
      subtotal,
      subtotalCents,
      gstTotal,
      gstTotalCents,
      deliveryFee,
      deliveryFeeCents,
      total,
      totalCents
    };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        totals,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
