/** Browser helper for admin JSON calls. Same-origin fetch; Basic Auth credentials are supplied by the browser. */
export interface AdminResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T & { error?: string; reasons?: string[]; fields?: Record<string, string>; problems?: { productId: string; reason: string }[] };
}

export async function adminRequest<T = Record<string, unknown>>(url: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<AdminResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network error. Check your connection and try again." } as AdminResult<T>["data"] };
  }
}

/** Human message for a failed result, including server-supplied reasons. */
export function errorText(result: { data: { error?: string; reasons?: string[]; problems?: { productId: string; reason: string }[] } }): string {
  const base = result.data.error ?? "Something went wrong.";
  const extra = [...(result.data.reasons ?? []), ...(result.data.problems?.map((p) => p.reason) ?? [])];
  return extra.length ? `${base} ${extra.join(" ")}` : base;
}

/** Dollars typed in a form to integer cents; null for blank; NaN-safe (returns undefined when invalid). */
export function dollarsToCents(text: string): number | null | undefined {
  const t = text.trim().replace(/^\$/, "");
  if (t === "") return null;
  const m = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(t);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : undefined;
}

export const centsToDollars = (cents: number | null | undefined) => (typeof cents === "number" ? (cents / 100).toFixed(2) : "");
export const fmt = (cents: number | null | undefined) => (typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "—");
