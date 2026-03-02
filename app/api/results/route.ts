import { NextResponse } from "next/server";
import { processingResults } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get("mediaId");

  if (!mediaId) {
    return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  }

  const result = processingResults.get(mediaId);

  if (!result) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
