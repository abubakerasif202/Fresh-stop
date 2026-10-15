/** Pure admin Basic Auth helpers (edge-safe: no node imports). */

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

export function decodeBasic(header: string | null): { user: string; pass: string } | null {
  if (!header || !header.toLowerCase().startsWith("basic ")) return null;
  try {
    const bin = atob(header.slice(6).trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

/** True when the Authorization header carries the expected credentials. */
export function isAdminAuthorized(
  header: string | null,
  expectedUser: string,
  expectedPass: string
): boolean {
  const creds = decodeBasic(header);
  // Evaluate both comparisons (no short-circuit) to keep timing uniform.
  const userOk = safeEqual(creds?.user ?? "", expectedUser);
  const passOk = safeEqual(creds?.pass ?? "", expectedPass);
  return creds !== null && userOk && passOk;
}
