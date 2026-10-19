import { handleExpireSweep } from "@/lib/public-api-handlers";

export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleExpireSweep(request);
}

export function POST(request: Request): Promise<Response> {
  return handleExpireSweep(request);
}
