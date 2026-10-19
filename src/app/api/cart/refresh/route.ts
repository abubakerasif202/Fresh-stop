import { isApprovedPrice } from "@/lib/product-commerce";
import { indicativePrice, STOREFRONT_DEMO } from "@/lib/indicative-pricing";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, sharedRateLimit } from "@/lib/rate-limit";
import { buildRefreshResults, parseRefreshRequest } from "@/lib/cart-refresh-server";

export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 60, windowMs: 60_000 };
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Read-only cart refresh: returns the CURRENT server price and purchasability for each cart line so the UI can
 * warn about stale snapshots. It never reserves stock and is not used to price an order (checkout re-prices).
 */
export async function POST(request: Request) {
  const limit = await sharedRateLimit(`cart-refresh:${getClientIp(request.headers)}`, RATE_LIMIT);
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.unavailable ? "Cart refresh is temporarily unavailable." : "Too many requests." },
      { status: limit.unavailable ? 503 : 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });
  }
  const requested = parseRefreshRequest(body);
  if (!requested) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: NO_STORE });

  try {
    const rows = await db.product.findMany({
      where: { id: { in: requested.map((r) => r.productId) } },
      select: {
        id: true,
        slug: true,
        unit: true,
        suggestedPriceCents: true,
        priceSource: true,
        isPublished: true,
        isActive: true,
        isPurchasable: true,
        approvalStatus: true,
        priceApprovedBy: true,
        priceCents: true,
        stockVerified: true,
        stockQuantity: true,
        reservedQuantity: true,
        availabilityStatus: true
      }
    });
    if (STOREFRONT_DEMO) {
      const demoPrices = rows.filter(row => row.isPublished).flatMap(row => {
        const draft = row.suggestedPriceCents;
        const fallback = indicativePrice(row.slug);
        const draftCents = row.priceSource === "ADMIN_DRAFT" && Number.isInteger(draft) && (draft ?? 0) > 0 && (draft ?? 0) <= 1_000_000 ? draft : null;
        const approvedCents = isApprovedPrice(row) ? row.priceCents : null;
        const cents = approvedCents ?? draftCents ?? fallback?.priceCents;
        const unit = approvedCents !== null || draftCents !== null ? row.unit ?? fallback?.unit ?? "each" : fallback?.unit ?? row.unit ?? "each";
        return cents ? [{ productId: row.id, priceCents: cents, unit }] : [];
      });
      return NextResponse.json({ mode: "indicative", demoPrices }, { headers: NO_STORE });
    }
    return NextResponse.json({ items: buildRefreshResults(requested, rows) }, { headers: NO_STORE });
  } catch {
    console.error("Cart refresh could not read the catalogue");
    return NextResponse.json({ error: "Cart refresh is temporarily unavailable." }, { status: 503, headers: NO_STORE });
  }
}
