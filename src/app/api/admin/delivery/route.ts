import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin, requireWritableAdmin, sameOrigin } from "@/lib/admin-route";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const zones = await db.deliveryZone.findMany({
      orderBy: { name: "asc" }
    });
    return jsonNoStore({ zones });
  } catch (err) {
    console.error("Admin delivery zones fetch error:", err);
    return jsonNoStore({ error: "Failed to load delivery zones." }, 500);
  }
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const readOnly = requireWritableAdmin();
  if (readOnly) return readOnly;
  if (!sameOrigin(request)) return jsonNoStore({ error: "Invalid request origin." }, 403);

  try {
    const body = await request.json();
    const { name, postcodes, deliveryFee, freeDeliveryMinSpend, minOrderAmount, primaryBranchSlug, orderCutoffHour, deliveryDays, maxDailyOrders } = body || {};

    if (!name || !postcodes) {
      return jsonNoStore({ error: "Zone name and postcodes are required." }, 400);
    }

    const created = await db.deliveryZone.create({
      data: {
        name: String(name).trim(),
        postcodes: String(postcodes).trim(),
        deliveryFee: Number(deliveryFee) || 9.99,
        freeDeliveryMinSpend: Number(freeDeliveryMinSpend) || 150.0,
        minOrderAmount: Number(minOrderAmount) || 50.0,
        primaryBranchSlug: String(primaryBranchSlug || "rockdale").trim(),
        orderCutoffHour: Number(orderCutoffHour) || 14,
        deliveryDays: String(deliveryDays || "Mon,Tue,Wed,Thu,Fri,Sat").trim(),
        maxDailyOrders: Number(maxDailyOrders) || 30,
        isActive: true
      }
    });

    await db.adminAuditLog.create({
      data: {
        action: "DELIVERY_ZONE_CREATED",
        entityType: "DeliveryZone",
        entityId: created.id,
        details: `Created delivery zone ${created.name}`
      }
    });

    return jsonNoStore({ success: true, zone: created }, 201);
  } catch (err) {
    console.error("Create delivery zone error:", err);
    return jsonNoStore({ error: "Failed to create delivery zone." }, 500);
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
    const { id, name, postcodes, deliveryFee, freeDeliveryMinSpend, minOrderAmount, primaryBranchSlug, isActive, orderCutoffHour, deliveryDays, maxDailyOrders } = body || {};

    if (!id) {
      return jsonNoStore({ error: "Zone ID is required." }, 400);
    }

    const updated = await db.deliveryZone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(postcodes !== undefined && { postcodes: String(postcodes).trim() }),
        ...(deliveryFee !== undefined && { deliveryFee: Number(deliveryFee) }),
        ...(freeDeliveryMinSpend !== undefined && { freeDeliveryMinSpend: Number(freeDeliveryMinSpend) }),
        ...(minOrderAmount !== undefined && { minOrderAmount: Number(minOrderAmount) }),
        ...(primaryBranchSlug !== undefined && { primaryBranchSlug: String(primaryBranchSlug).trim() }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(orderCutoffHour !== undefined && { orderCutoffHour: Number(orderCutoffHour) }),
        ...(deliveryDays !== undefined && { deliveryDays: String(deliveryDays).trim() }),
        ...(maxDailyOrders !== undefined && { maxDailyOrders: Number(maxDailyOrders) })
      }
    });

    await db.adminAuditLog.create({
      data: {
        action: "DELIVERY_ZONE_UPDATED",
        entityType: "DeliveryZone",
        entityId: id,
        details: `Updated delivery zone ${updated.name}`
      }
    });

    return jsonNoStore({ success: true, zone: updated });
  } catch (err) {
    console.error("Update delivery zone error:", err);
    return jsonNoStore({ error: "Failed to update delivery zone." }, 500);
  }
}
