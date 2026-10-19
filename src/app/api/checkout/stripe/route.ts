import { handleCheckout } from "@/lib/checkout-service";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleCheckout(request);
}
