import { NextResponse } from "next/server";
import { getPickupSlots, STORE_TIMEZONE } from "@/lib/pickup-slots";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  return NextResponse.json(
    { slots: getPickupSlots(now), serverTime: now.toISOString(), timezone: STORE_TIMEZONE },
    { headers: { "Cache-Control": "no-store" } }
  );
}
