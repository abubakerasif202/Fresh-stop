import { jsonNoStore, requireAdmin } from "@/lib/admin-route";
import { adminErrorResponse, guardAdminMutation } from "@/lib/admin-audit";
import { setPaidCheckoutApproved } from "@/lib/admin-paid-checkout";
import { describeGate } from "@/lib/admin-gate-view";
import { getPaidCheckoutStatus } from "@/lib/commerce-gate";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return jsonNoStore(describeGate(await getPaidCheckoutStatus()));
}

/** POST {enabled, confirmation}. Sets only the database half of the gate; PAID_CHECKOUT_ENABLED must also be set in the environment. */
export async function POST(request: Request) {
  const guard = await guardAdminMutation(request);
  if (!guard.ok) return guard.response;
  try {
    await setPaidCheckoutApproved(guard.body.enabled, guard.body.confirmation, guard.admin);
    return jsonNoStore({ success: true, ...describeGate(await getPaidCheckoutStatus()) });
  } catch (error) {
    return adminErrorResponse(error, "Updating paid checkout approval");
  }
}
