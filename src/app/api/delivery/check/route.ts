import { NextResponse } from "next/server";
import { checkDelivery } from "@/lib/delivery";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const postcode = typeof body?.postcode === "string" ? body.postcode : "";
    const subtotal = typeof body?.subtotal === "number" ? body.subtotal : 0;

    if (!postcode) {
      return NextResponse.json(
        { eligible: false, message: "Please provide a delivery postcode." },
        { status: 400 }
      );
    }

    const result = await checkDelivery(postcode, subtotal);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Delivery check error:", err);
    return NextResponse.json(
      { eligible: false, message: "Unable to check delivery eligibility at this moment." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postcode = searchParams.get("postcode") || "";
  const subtotal = Number(searchParams.get("subtotal") || "0");

  if (!postcode) {
    return NextResponse.json(
      { eligible: false, message: "Please provide a delivery postcode." },
      { status: 400 }
    );
  }

  const result = await checkDelivery(postcode, subtotal);
  return NextResponse.json(result);
}
