import { test } from "node:test";
import assert from "node:assert/strict";
import { clearCheckoutAttempt, getCheckoutAttempt } from "./checkout-attempt";

test("checkout retries recover a stored identity without persisting customer fields", async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
  const payload = JSON.stringify({ email: "private@example.test", items: [{ id: "apple", quantity: 2 }] });
  const first = await getCheckoutAttempt(payload, storage);
  const recovered = "12345678-1234-4123-8123-123456789abc";
  storage.setItem(`fresh-stop-checkout-attempt:${first.digest}`, recovered);
  assert.equal((await getCheckoutAttempt(payload, storage)).key, recovered);
  assert.match(first.digest, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify([...values]).includes("private@example.test"));
  assert.notEqual((await getCheckoutAttempt(payload + " ", storage)).key, recovered);
  clearCheckoutAttempt({ digest: first.digest, key: recovered }, storage);
  assert.notEqual((await getCheckoutAttempt(payload, storage)).key, recovered);
});

test("checkout retries retain an in-memory identity when storage is unavailable", async () => {
  const storage = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); }
  };
  const first = await getCheckoutAttempt("blocked-storage-order", storage);
  assert.deepEqual(await getCheckoutAttempt("blocked-storage-order", storage), first);
  clearCheckoutAttempt(first, storage);
  assert.notEqual((await getCheckoutAttempt("blocked-storage-order", storage)).key, first.key);
});
