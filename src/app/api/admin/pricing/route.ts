import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/admin-route";
import { adminErrorResponse, guardAdminMutation, jsonError } from "@/lib/admin-audit";
import { approveProductPrice, approveSelectedAtSuggested, revokeProductApproval } from "@/lib/admin-pricing-actions";
import { commerceState, countRefs, effectiveSuggestedCents, marketRefsFor, reviewFlags, stockStatus } from "@/lib/admin-pricing";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const [products, categories] = await Promise.all([
      db.product.findMany({
        include: {
          category: { select: { id: true, name: true, slug: true } },
          marketReferences: true,
          priceHistory: { orderBy: { createdAt: "desc" }, take: 3 }
        },
        orderBy: [{ approvalStatus: "asc" }, { name: "asc" }]
      }),
      db.category.findMany({ orderBy: { displayOrder: "asc" }, select: { id: true, name: true, slug: true } })
    ]);
    // Explicit DTO: costPrice and the legacy marketPrice are never sent to the browser.
    const rows = products.map((p) => {
      const refs = marketRefsFor(p, p.marketReferences);
      return {
        id: p.id, slug: p.slug, name: p.name, imageUrl: p.imageUrl, unit: p.unit, category: p.category,
        suggestedPriceCents: effectiveSuggestedCents(p), approvedPriceCents: p.approvalStatus === "APPROVED" ? p.priceCents : null,
        approvalStatus: p.approvalStatus, priceApprovedBy: p.priceApprovedBy, priceApprovedAt: p.priceApprovedAt,
        priceSource: p.priceSource, taxCategory: p.taxCategory, isPurchasable: p.isPurchasable,
        stockStatus: stockStatus(p), commerceState: commerceState(p), review: reviewFlags(p),
        refCounts: countRefs(refs), refs, priceHistory: p.priceHistory
      };
    });
    return jsonNoStore({ products: rows, categories });
  } catch (error) {
    return adminErrorResponse(error, "Loading pricing data");
  }
}

const REMOVED_ACTIONS = new Set(["bulk_approve", "update"]);

export async function PATCH(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const { body, admin } = guard;
  const action = body.action;
  try {
    if (typeof action === "string" && REMOVED_ACTIONS.has(action)) {
      return jsonError("This action was removed. Approve a typed price per product, or use approve_selected for up to 10 products.", 400, { code: "UNSAFE_BULK_REMOVED" });
    }
    if (action === "approve") {
      const product = await approveProductPrice({
        productId: body.productId as string, price: body.price, confirmedName: body.confirmedName,
        confirmedPriceCents: body.confirmedPriceCents, unit: body.unit, override: body.override as { reason?: unknown } | null
      }, admin);
      return jsonNoStore({ success: true, productId: product.id, priceCents: product.priceCents });
    }
    if (action === "approve_selected") {
      const results = await approveSelectedAtSuggested(body.items, body.confirmation, admin);
      return jsonNoStore({ success: true, approved: results });
    }
    if (action === "revoke") {
      const product = await revokeProductApproval(body.productId, body.reason, admin);
      return jsonNoStore({ success: true, productId: product.id });
    }
    return jsonError("Invalid action.", 400);
  } catch (error) {
    return adminErrorResponse(error, "Updating pricing");
  }
}
