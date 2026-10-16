import { NextResponse } from "next/server";

/** Legacy customer purchase endpoints are permanently retired; never read a body or database. */
export function purchaseRetired() {
  return NextResponse.json({ error: "Online ordering is no longer available. Please contact Fresh Stop for enquiries.", contact: "/wholesale" }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
