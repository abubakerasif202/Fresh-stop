import { MAX_CART_LINES, sanitizeLines, type CartLine } from "./cart-core";

export const CART_STORAGE_KEY = "fresh_stop_cart_v2";
export const LEGACY_CART_STORAGE_KEY = "fresh_stop_cart_v1";
export const CART_SCHEMA_VERSION = 2;

/** Minimal Storage surface so the store can be tested without a browser. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeCart(lines: readonly CartLine[]): string {
  return JSON.stringify({ version: CART_SCHEMA_VERSION, lines: lines.slice(0, MAX_CART_LINES) });
}

/** Parses the versioned payload. Anything corrupt, unversioned or from a future version is discarded. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return [];
    const record = data as Record<string, unknown>;
    return record.version === CART_SCHEMA_VERSION ? sanitizeLines(record.lines) : [];
  } catch {
    return [];
  }
}

/** v1 stored a bare array of lines with floating-point prices; only the integer-cent field is carried over. */
export function parseLegacyCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    return sanitizeLines(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Never throws: private mode, blocked storage and quota errors all degrade to an empty/in-memory cart. */
export function readCart(storage: StorageLike | null): CartLine[] {
  if (!storage) return [];
  try {
    const current = storage.getItem(CART_STORAGE_KEY);
    if (current !== null) return parseCart(current);
    return parseLegacyCart(storage.getItem(LEGACY_CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function writeCart(storage: StorageLike | null, lines: readonly CartLine[]): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CART_STORAGE_KEY, serializeCart(lines));
    storage.removeItem(LEGACY_CART_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
