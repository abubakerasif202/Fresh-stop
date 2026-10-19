import { db } from "@/lib/db";
import { jsonNoStore, requireAdmin } from "@/lib/admin-route";
import { adminErrorResponse, guardAdminMutation, jsonError } from "@/lib/admin-audit";
import { approveZone, createZone, deleteZone, unapproveZone, updateZone, validateZoneInput } from "@/lib/admin-delivery";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    const [zones, branches] = await Promise.all([
      db.deliveryZone.findMany({ orderBy: { name: "asc" } }),
      db.storeBranch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { slug: true, name: true } })
    ]);
    return jsonNoStore({ zones, branches, hasApprovedZone: zones.some((z) => z.isApproved && z.isActive) });
  } catch (error) {
    return adminErrorResponse(error, "Loading delivery zones");
  }
}

export async function POST(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const parsed = validateZoneInput(guard.body, false);
  if (!parsed.ok) return jsonError("Please fix the highlighted fields.", 422, { fields: parsed.errors });
  try {
    return jsonNoStore({ success: true, zone: await createZone(parsed.value, guard.admin) }, 201);
  } catch (error) {
    return adminErrorResponse(error, "Creating delivery zone");
  }
}

const idOf = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null);

/** PATCH {id, action:"approve"|"unapprove"} or {id, ...fields}. Money/postcode edits reset approval. */
export async function PATCH(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const { id: rawId, action, ...fields } = guard.body;
  const id = idOf(rawId);
  if (!id) return jsonError("Zone ID is required.", 400);
  try {
    if (action === "approve") return jsonNoStore({ success: true, zone: await approveZone(id, guard.admin) });
    if (action === "unapprove") return jsonNoStore({ success: true, zone: await unapproveZone(id, guard.admin) });
    if (action !== undefined) return jsonError("Invalid action.", 400);
    const parsed = validateZoneInput(fields, true);
    if (!parsed.ok) return jsonError("Please fix the highlighted fields.", 422, { fields: parsed.errors });
    const { zone, approvalReset } = await updateZone(id, parsed.value, guard.admin);
    return jsonNoStore({ success: true, zone, approvalReset });
  } catch (error) {
    return adminErrorResponse(error, "Updating delivery zone");
  }
}

/** DELETE {id}. Body-based so the same size, origin and auth gate applies. */
export async function DELETE(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const id = idOf(guard.body.id);
  if (!id) return jsonError("Zone ID is required.", 400);
  try {
    await deleteZone(id, guard.admin);
    return jsonNoStore({ success: true });
  } catch (error) {
    return adminErrorResponse(error, "Deleting delivery zone");
  }
}
