import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getContentType(filename: string) {
  const ext = path.extname(filename).toLowerCase();

  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

async function buildFileResponse(
  { params }: { params: Promise<{ filename: string }> },
  includeBody: boolean,
) {
  const { filename } = await params;
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(includeBody ? fileBuffer : null, {
    status: 200,
    headers: {
      "Content-Type": getContentType(safeFilename),
      "Content-Length": String(fileBuffer.byteLength),
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
    },
  });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> },
) {
  return buildFileResponse(context, true);
}

export async function HEAD(
  _req: Request,
  context: { params: Promise<{ filename: string }> },
) {
  return buildFileResponse(context, false);
}
