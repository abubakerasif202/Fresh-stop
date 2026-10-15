import { NextResponse } from "next/server";
import { checkDeliveryEligibility } from "@/lib/delivery";

export async function POST(request: Request) {
  try {
    const { postcode, subtotal } = await request.json();

    if (!postcode) {
      return NextResponse.json({ error: "Postcode is required" }, { status: 400 });
    }

    const result = checkDeliveryEligibility(String(postcode), Number(subtotal) || 0);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Delivery eligibility check failed:", error);
    return NextResponse.json({ error: "Failed to verify delivery eligibility" }, { status: 500 });
  }
}
