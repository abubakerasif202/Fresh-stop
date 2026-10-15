const PREFIX = "fresh-stop-checkout-attempt:";
const attempts = new Map<string, string>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type CheckoutAttempt = { digest: string; key: string };

function session(): AttemptStorage | undefined {
  try { return window.sessionStorage; } catch { return undefined; }
}

/** Persist only a payload fingerprint and random retry key, never checkout fields. */
export async function getCheckoutAttempt(payload: string, storage = session()): Promise<CheckoutAttempt> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const digest = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  let key = attempts.get(digest);
  try {
    const stored = storage?.getItem(PREFIX + digest);
    if (stored && UUID.test(stored)) key = stored;
  } catch { /* Storage restrictions still allow retries during this page session. */ }
  key ??= crypto.randomUUID();
  attempts.set(digest, key);
  try { storage?.setItem(PREFIX + digest, key); } catch { /* Keep the in-memory retry identity. */ }
  return { digest, key };
}

export function clearCheckoutAttempt(attempt: CheckoutAttempt, storage = session()): void {
  attempts.delete(attempt.digest);
  try { storage?.removeItem(PREFIX + attempt.digest); } catch { /* Confirmed orders can proceed without storage. */ }
}
