import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = path.join(DATA_DIR, "results_data.json");

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mediaId = searchParams.get("mediaId");

  if (!mediaId) {
    return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  }

  let results: Record<string, any> = {};
  if (fs.existsSync(RESULTS_FILE)) {
    try {
      results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    } catch (e) {
      console.error("Error reading results file", e);
    }
  }

  const result = results[mediaId];

  if (!result) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
