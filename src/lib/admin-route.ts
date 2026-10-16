import { NextResponse } from "next/server";
import { isAdminAuthorized } from "./admin-auth";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Defence in depth for /api/admin/* handlers. Middleware already guards these paths;
 * handlers re-check so a matcher change can never silently expose product management.
 * Returns a response to send when the request must be rejected, else null.
 */
export function requireAdmin(request: Request): NextResponse | null {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return NextResponse.json({ error: "Admin access is not configured." }, { status: 503, headers: NO_STORE });
  const user = process.env.ADMIN_USER || "admin";
  if (!isAdminAuthorized(request.headers.get("authorization"), user, pass)) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { ...NO_STORE, "WWW-Authenticate": 'Basic realm="Fresh Stop Admin", charset="UTF-8"' } }
    );
  }
  return null;
}

/** Reject cross-origin mutating requests. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export const jsonNoStore = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/** A reviewed Preview may share production credentials, so every mutation must fail closed. */
export function requireWritableAdmin(): NextResponse | null {
  if (process.env.CATALOGUE_DATA_SOURCE === "reviewed-snapshot") {
    return jsonNoStore({ error: "This reviewed catalogue Preview is read-only. Database changes are disabled." }, 409);
  }
  return null;
}
