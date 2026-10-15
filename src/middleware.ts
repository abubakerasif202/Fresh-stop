import { NextResponse, type NextRequest } from "next/server";

/** Constant-time string comparison (edge runtime: no node:crypto). */
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

function decodeBasic(header: string | null): { user: string; pass: string } | null {
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

export function middleware(request: NextRequest) {
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass) {
    // Fail closed: admin is disabled until a password is configured.
    return new NextResponse("Admin access is not configured.", {
      status: 503,
      headers: { "Cache-Control": "no-store" }
    });
  }
  const expectedUser = process.env.ADMIN_USER || "admin";
  const creds = decodeBasic(request.headers.get("authorization"));
  // Evaluate both comparisons (no short-circuit) to keep timing uniform.
  const userOk = safeEqual(creds?.user ?? "", expectedUser);
  const passOk = safeEqual(creds?.pass ?? "", expectedPass);
  if (creds && userOk && passOk) {
    return NextResponse.next();
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Fresh Stop Admin", charset="UTF-8"',
      "Cache-Control": "no-store"
    }
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
