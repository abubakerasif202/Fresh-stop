import { NextResponse } from "next/server";
import { getCatalogue } from "@/lib/catalogue-data";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const category = params.get("category") || undefined;
  const q = params.get("q")?.trim() || undefined;
  const limit = Number(params.get("limit") || 100);
  if ((q?.length ?? 0) > 100 || (category?.length ?? 0) > 100 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return NextResponse.json({ error: "Invalid catalogue filters" }, { status: 400 });
  }
  try { return NextResponse.json(await getCatalogue({category,q,limit})); }
  catch {
    console.error("Public catalogue could not be loaded");
    return NextResponse.json({error:"The catalogue is temporarily unavailable. Please contact our team."},{status:503});
  }
}
