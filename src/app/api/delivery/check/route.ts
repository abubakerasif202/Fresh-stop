import { NextResponse } from "next/server";
import { checkDeliveryEligibility } from "@/lib/delivery";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { postcode, subtotal = 0 } = body as Record<string, unknown>;
  if (typeof postcode !== "string" || !/^\d{4}$/.test(postcode.trim())) {
    return NextResponse.json({ error: "A valid four-digit postcode is required" }, { status: 400 });
  }
  if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0) {
    return NextResponse.json({ error: "A valid basket subtotal is required" }, { status: 400 });
  }
  return NextResponse.json(checkDeliveryEligibility(postcode, subtotal));
}
