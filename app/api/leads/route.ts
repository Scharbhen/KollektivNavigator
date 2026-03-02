import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "leads_data.json");

export async function GET() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json({ leads: [] });
    }
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return NextResponse.json({ leads: JSON.parse(data) });
  } catch (error) {
    console.error("Error reading leads:", error);
    return NextResponse.json({ error: "Failed to read leads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, source, metadata } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const newLead = {
      id: Date.now().toString(),
      email,
      source: source || "unknown",
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    };

    let leads = [];
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      leads = JSON.parse(data);
    }

    leads.push(newLead);
    fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));

    return NextResponse.json({ success: true, lead: newLead });
  } catch (error) {
    console.error("Error saving lead:", error);
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }
}
