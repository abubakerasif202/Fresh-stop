import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin, requireWritableAdmin, sameOrigin } from "@/lib/admin-route";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const products = await db.product.findMany({
      include: {
        category: { select: { id: true, name: true, slug: true } },
        marketReferences: true,
        priceHistory: { orderBy: { createdAt: "desc" }, take: 5 }
      },
      orderBy: [{ approvalStatus: "asc" }, { name: "asc" }]
    });

    const categories = await db.category.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, slug: true }
    });

    return jsonNoStore({ products, categories });
  } catch (err) {
    console.error("Admin pricing list error:", err);
    return jsonNoStore({ error: "Failed to load pricing data." }, 500);
  }
}

export async function PATCH(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const readOnly = requireWritableAdmin();
  if (readOnly) return readOnly;
  if (!sameOrigin(request)) return jsonNoStore({ error: "Invalid request origin." }, 403);

  try {
    const body = await request.json();
    const { productId, action, price, unit, approvalStatus } = body || {};

    if (!productId) {
      return jsonNoStore({ error: "Product ID is required." }, 400);
    }

    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return jsonNoStore({ error: "Product not found." }, 404);
    }

    // Action: Approve suggested price
    if (action === "approve") {
      const priceToApprove = typeof price === "number" ? price : product.marketPrice ? product.marketPrice * 0.9 : product.price;
      const priceCents = priceToApprove ? Math.round(priceToApprove * 100) : null;

      const updated = await db.product.update({
        where: { id: productId },
        data: {
          approvalStatus: "APPROVED",
          price: priceToApprove,
          priceCents,
          isPurchasable: true,
          priceApprovedAt: new Date(),
          priceUpdatedAt: new Date()
        }
      });

      await db.adminAuditLog.create({
        data: {
          action: "PRICE_APPROVED",
          entityType: "Product",
          entityId: productId,
          details: `Approved selling price A$${priceToApprove?.toFixed(2)}`
        }
      });

      return jsonNoStore({ success: true, product: updated });
    }

    // Action: Update price & unit
    if (action === "update") {
      if (typeof price !== "number" || price <= 0) {
        return jsonNoStore({ error: "Price must be a positive number." }, 400);
      }

      const newPriceCents = Math.round(price * 100);
      const oldPriceCents = product.priceCents;

      const updated = await db.product.update({
        where: { id: productId },
        data: {
          price,
          priceCents: newPriceCents,
          unit: unit || product.unit,
          approvalStatus: approvalStatus || "APPROVED",
          isPurchasable: true,
          priceUpdatedAt: new Date()
        }
      });

      // Record price history
      await db.productPriceHistory.create({
        data: {
          productId,
          oldPriceCents,
          newPriceCents,
          changedBy: "admin",
          reason: "Manual admin price modification"
        }
      });

      await db.adminAuditLog.create({
        data: {
          action: "PRICE_MODIFIED",
          entityType: "Product",
          entityId: productId,
          details: `Updated price from A$${oldPriceCents ? (oldPriceCents / 100).toFixed(2) : "None"} to A$${price.toFixed(2)}`
        }
      });

      return jsonNoStore({ success: true, product: updated });
    }

    // Action: Bulk approve
    if (action === "bulk_approve") {
      const pendingProducts = await db.product.findMany({
        where: { approvalStatus: "PENDING", marketPrice: { not: null } }
      });

      for (const p of pendingProducts) {
        const approvedPrice = Number((p.marketPrice! * 0.9).toFixed(2));
        await db.product.update({
          where: { id: p.id },
          data: {
            approvalStatus: "APPROVED",
            price: approvedPrice,
            priceCents: Math.round(approvedPrice * 100),
            isPurchasable: true,
            priceApprovedAt: new Date()
          }
        });
      }

      await db.adminAuditLog.create({
        data: {
          action: "BULK_PRICE_APPROVED",
          entityType: "Product",
          details: `Bulk approved ${pendingProducts.length} pending prices.`
        }
      });

      return jsonNoStore({ success: true, count: pendingProducts.length });
    }

    return jsonNoStore({ error: "Invalid action." }, 400);
  } catch (err) {
    console.error("Admin pricing update failed:", err);
    return jsonNoStore({ error: "Failed to update pricing." }, 500);
  }
}
