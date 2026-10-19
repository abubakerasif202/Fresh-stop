import type { CartLine } from "./cart-core";
import { CART_STORAGE_KEY, LEGACY_CART_STORAGE_KEY, readCart, writeCart, type StorageLike } from "./cart-storage";

const EMPTY: readonly CartLine[] = Object.freeze([]);

export interface CartStore {
  getSnapshot(): readonly CartLine[];
  getServerSnapshot(): readonly CartLine[];
  subscribe(listener: () => void): () => void;
  /** Replaces the cart with the result of `update` and persists it (best effort). */
  update(update: (lines: readonly CartLine[]) => readonly CartLine[]): void;
  /** Re-reads storage; used for the cross-tab `storage` event. */
  handleStorageEvent(key: string | null): void;
}

/**
 * External store for useSyncExternalStore. The server snapshot is always empty, so server HTML and the first
 * client render agree; the real cart is read from localStorage after hydration.
 */
export function createCartStore(getStorage: () => StorageLike | null): CartStore {
  let lines: readonly CartLine[] = EMPTY;
  let loaded = false;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((l) => l());
  const load = () => {
    const next = readCart(getStorage());
    lines = next.length ? next : EMPTY;
    loaded = true;
  };

  return {
    getSnapshot() {
      if (!loaded) load();
      return lines;
    },
    getServerSnapshot: () => EMPTY,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(update) {
      if (!loaded) load();
      const next = update(lines);
      lines = next.length ? next : EMPTY;
      writeCart(getStorage(), lines);
      emit();
    },
    handleStorageEvent(key) {
      if (key !== null && key !== CART_STORAGE_KEY && key !== LEGACY_CART_STORAGE_KEY) return;
      load();
      emit();
    }
  };
}

export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
