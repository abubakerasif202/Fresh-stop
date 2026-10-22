import { handleEnquiry } from "@/lib/enquiry-service";

export const dynamic = "force-dynamic";

export function POST(request: Request): Promise<Response> {
  return handleEnquiry(request);
}
