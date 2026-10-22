import { jsonNoStore, requireAdmin, requireWritableAdmin } from "@/lib/admin-route";
import { adminErrorResponse, guardAdminMutation, jsonError, recordAudit } from "@/lib/admin-audit";
import { ENQUIRY_KIND_VALUES, ENQUIRY_STATUSES, listEnquiries, pickOf, setEnquiryStatus } from "@/lib/admin-enquiries";
import { db } from "@/lib/db";
import { sendEnquiryEmail } from "@/lib/enquiry-email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = requireAdmin(request) ?? requireWritableAdmin();
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Math.min(10_000, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1));
    return jsonNoStore(await listEnquiries({
      kind: pickOf(ENQUIRY_KIND_VALUES, searchParams.get("kind")),
      status: pickOf(ENQUIRY_STATUSES, searchParams.get("status")),
      page
    }));
  } catch (error) {
    return adminErrorResponse(error, "Loading enquiries");
  }
}

/** PATCH {enquiryId, status} | {enquiryId, action:"resend_email"}. */
export async function PATCH(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  const { body, admin } = guard;
  try {
    const { enquiryId } = body;
    if (typeof enquiryId !== "string" || enquiryId.length < 1 || enquiryId.length > 64) return jsonError("enquiryId is required", 400);
    if (body.action === "resend_email") {
      const result = await sendEnquiryEmail(enquiryId);
      if (result.reason === "NOT_FOUND") return jsonError("Enquiry not found.", 404);
      await db.$transaction((tx) => recordAudit(tx, { action: "ENQUIRY_RESEND_EMAIL", entityType: "Enquiry", entityId: enquiryId, after: { emailed: result.sent, reason: result.reason ?? null }, admin }));
      return jsonNoStore({ success: true, emailed: result.sent, reason: result.reason ?? null });
    }
    const status = pickOf(ENQUIRY_STATUSES, typeof body.status === "string" ? body.status : null);
    if (!status) return jsonError(`Invalid status. Must be one of: ${ENQUIRY_STATUSES.join(", ")}`, 400);
    return jsonNoStore({ success: true, enquiry: await setEnquiryStatus(enquiryId, status, admin) });
  } catch (error) {
    return adminErrorResponse(error, "Updating enquiry");
  }
}
