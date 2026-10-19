"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  addLine,
  applyRefresh,
  estimatedSubtotalCents,
  itemCount,
  removeLine,
  removeLines,
  setLineQuantity,
  unavailableIds,
  type CartLine,
  type CartLineInput,
  type LineStatusMap,
  type RefreshResult
} from "@/lib/cart-core";
import { browserStorage, createCartStore } from "@/lib/cart-store";
import { STOREFRONT_DEMO } from "@/lib/indicative-pricing";
import { parseRefreshResponse } from "@/lib/cart-refresh";

export type RefreshState = "idle" | "loading" | "failed";

interface CartContextType {
  /** False during SSR and the hydration render; true once the real cart has been read from storage. */
  ready: boolean;
  items: readonly CartLine[];
  itemCount: number;
  /** Estimated from display snapshots only; never authoritative. */
  estimatedSubtotalCents: number;
  isOpen: boolean;
  statuses: LineStatusMap;
  refreshState: RefreshState;
  hasUnavailable: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartLineInput, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
  dismissStatus: (productId: string) => void;
  removeUnavailable: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const store = createCartStore(browserStorage);
const REFRESH_TIMEOUT_MS = 8000;
const subscribeNever = () => () => {};

async function fetchRefresh(lines: readonly CartLine[]): Promise<RefreshResult[] | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const response = await fetch("/api/cart/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) }),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) return null;
    return parseRefreshResponse(await response.json());
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [isOpen, setIsOpen] = useState(false);
  const [rawStatuses, setStatuses] = useState<LineStatusMap>({});
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const inFlight = useRef(false);

  // Cross-tab sync: another tab writing the cart fires `storage` here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => store.handleStorageEvent(e.key);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const addItem = useCallback((item: CartLineInput, quantity = 1) => {
    store.update((lines) => addLine(lines, item, quantity));
    setIsOpen(true);
  }, []);
  const removeItem = useCallback((id: string) => store.update((lines) => removeLine(lines, id)), []);
  const updateQuantity = useCallback((id: string, qty: number) => store.update((lines) => setLineQuantity(lines, id, qty)), []);
  const clearCart = useCallback(() => {
    store.update(() => []);
    setStatuses({});
  }, []);

  const refreshCart = useCallback(async () => {
    const requested = store.getSnapshot();
    if (STOREFRONT_DEMO) {
      if (inFlight.current || !requested.length) return;
      inFlight.current = true;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
      try {
        const response = await fetch("/api/cart/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: requested.map(line => ({ productId: line.productId, quantity: line.quantity })) }), signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object" || !("demoPrices" in payload) || !Array.isArray(payload.demoPrices)) return;
        const values = new Map<string, { priceCents: number; unit: string }>();
        for (const row of payload.demoPrices) {
          if (row && typeof row === "object" && typeof row.productId === "string" && Number.isInteger(row.priceCents) && row.priceCents > 0 && row.priceCents <= 1_000_000 && typeof row.unit === "string") values.set(row.productId, row);
        }
        store.update(lines => lines.map(line => {
          const current = values.get(line.productId);
          return current ? { ...line, priceCents: current.priceCents, unit: current.unit } : line;
        }));
        setStatuses({});
      } catch {
        // Shopping-list snapshots remain usable when the catalogue cannot be refreshed.
      } finally {
        window.clearTimeout(timeout);
        inFlight.current = false;
      }
      return;
    }
    if (inFlight.current || requested.length === 0) return;
    inFlight.current = true;
    setRefreshState("loading");
    const results = await fetchRefresh(requested);
    inFlight.current = false;
    if (!results) {
      setRefreshState("failed");
      return;
    }
    const ids = new Set(requested.map((l) => l.productId));
    const outcome = applyRefresh(requested, results);
    const updated = new Map(outcome.lines.map((l) => [l.productId, l]));
    store.update((lines) => lines.map((l) => (updated.has(l.productId) ? { ...l, priceCents: updated.get(l.productId)!.priceCents } : l)));
    setStatuses((prev) => ({ ...Object.fromEntries(Object.entries(prev).filter(([id]) => !ids.has(id))), ...outcome.statuses }));
    setRefreshState("idle");
  }, []);

  const dismissStatus = useCallback((id: string) => {
    setStatuses((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id)));
  }, []);

  const statuses = useMemo<LineStatusMap>(() => {
    const present = new Set(items.map((l) => l.productId));
    return Object.fromEntries(Object.entries(rawStatuses).filter(([id]) => present.has(id)));
  }, [rawStatuses, items]);

  const removeUnavailable = useCallback(() => {
    store.update((lines) => removeLines(lines, unavailableIds(statuses)));
  }, [statuses]);

  const value = useMemo<CartContextType>(
    () => ({
      ready,
      items,
      itemCount: itemCount(items),
      estimatedSubtotalCents: estimatedSubtotalCents(items),
      isOpen,
      statuses,
      refreshState,
      hasUnavailable: unavailableIds(statuses).length > 0,
      openCart,
      closeCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      refreshCart,
      dismissStatus,
      removeUnavailable
    }),
    [ready, items, isOpen, statuses, refreshState, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart, refreshCart, dismissStatus, removeUnavailable]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
