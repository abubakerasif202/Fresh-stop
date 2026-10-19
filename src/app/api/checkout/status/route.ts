import { handleCheckoutStatus } from "@/lib/public-api-handlers";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleCheckoutStatus(request);
}
