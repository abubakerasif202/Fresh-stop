import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getClientIp, peekRateLimit, rateLimit } from "@/lib/rate-limit";

/** Failed admin auth attempts allowed per IP before lockout. */
const FAILURE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

const NO_STORE = { "Cache-Control": "no-store" };

function withNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function middleware(request: NextRequest) {
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedPass) {
    // Fail closed: admin is disabled until a password is configured.
    return new NextResponse("Admin access is not configured.", {
      status: 503,
      headers: NO_STORE
    });
  }
  const expectedUser = process.env.ADMIN_USER || "admin";

  // Check lockout BEFORE comparing credentials so a locked IP cannot keep guessing.
  const key = `admin-fail:${getClientIp(request.headers)}`;
  const state = peekRateLimit(key, FAILURE_LIMIT);
  if (!state.ok) {
    return new NextResponse("Too many failed attempts. Try again later.", {
      status: 429,
      headers: { ...NO_STORE, "Retry-After": String(state.retryAfterSec) }
    });
  }

  if (isAdminAuthorized(request.headers.get("authorization"), expectedUser, expectedPass)) {
    return withNoStore(NextResponse.next());
  }

  // Only count attempts that actually presented credentials; a bare first request
  // (browser has not yet shown the Basic Auth prompt) is not a guess.
  if (request.headers.get("authorization")) {
    rateLimit(key, FAILURE_LIMIT);
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Fresh Stop Admin", charset="UTF-8"',
      ...NO_STORE
    }
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
