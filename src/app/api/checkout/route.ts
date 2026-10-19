import { NextResponse } from "next/server";
export { POST } from "./stripe/route";

export async function GET() {
  return NextResponse.json({
    status: "active",
    gateway: "stripe",
    currency: "AUD",
    methods: ["card", "apple_pay", "google_pay"]
  });
}
