import amqp from "amqplib";
import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = path.join(DATA_DIR, "results_data.json");
const CLASSIFY_QUEUE = process.env.RABBITMQ_CLASSIFY_QUEUE || "doc-2-classify";
const CLASSIFY_TIMEOUT_MS = Number(process.env.RABBITMQ_CLASSIFY_TIMEOUT_MS || 90000);

function readResults(): Record<string, any> {
  if (!fs.existsSync(RESULTS_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractMarkdownValue(source: unknown, depth = 0): string | null {
  if (!source || depth > 4) return null;
  if (typeof source === "string") return null;

  if (Array.isArray(source)) {
    for (const item of source) {
      const nested = extractMarkdownValue(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  if (!isRecord(source)) return null;

  for (const [key, value] of Object.entries(source)) {
    if (
      ["md", "markdown", "text", "content", "document_text", "documentText", "body"].includes(key) &&
      typeof value === "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const nested = extractMarkdownValue(value, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function parseClassificationReply(raw: string, mediaId: string): string | null {
  if (!raw.trim()) {
    return null;
  }

  const parsed = JSON.parse(raw);

  if (parsed?.extraction_error) {
    throw new Error(String(parsed.extraction_error));
  }

  const responseMediaId = parsed?.id ?? parsed?.media_id ?? parsed?.mediaId;
  if (responseMediaId != null && String(responseMediaId) !== mediaId) {
    return null;
  }

  const equals =
    parsed?.connect?.where?.title?.equals ??
    parsed?.connect?.where?.equals ??
    parsed?.documentType ??
    parsed?.document_type ??
    null;

  return typeof equals === "string" && equals.trim() ? equals.trim() : null;
}

async function classifyDocument(
  mediaId: string,
  markdown: string,
  documentTypes: string[],
  filename?: string,
): Promise<string> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error("RABBITMQ_URL is not set");
  }

  let connection: amqp.ChannelModel | null = null;
  let channel: amqp.Channel | null = null;
  let consumerTag: string | null = null;

  try {
    connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();
    await channel.checkQueue(CLASSIFY_QUEUE);
    const replyQueue = (await channel.assertQueue("", { exclusive: true, autoDelete: true, durable: false })).queue;

    const documentType = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Classifier did not answer in time"));
      }, CLASSIFY_TIMEOUT_MS);

      channel!
        .consume(
          replyQueue,
          (msg) => {
            if (!msg) return;

            try {
              const raw = msg.content.toString("utf-8");
              const parsedType = parseClassificationReply(raw, mediaId);
              if (!parsedType) {
                return;
              }

              clearTimeout(timeout);
              resolve(parsedType);
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
            }
          },
          { noAck: true },
        )
        .then((consumeOk) => {
          consumerTag = consumeOk.consumerTag;
          channel!.sendToQueue(
            CLASSIFY_QUEUE,
            Buffer.from(
              JSON.stringify({
                media_id: mediaId,
                md: markdown,
                filename,
                document_types: documentTypes,
                reply_queue: replyQueue,
              }),
            ),
            { contentType: "application/json" },
          );
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });

    return documentType;
  } finally {
    if (consumerTag && channel) {
      await channel.cancel(consumerTag).catch(() => undefined);
    }
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mediaId = typeof body?.mediaId === "string" ? body.mediaId.trim() : "";
    const filename = typeof body?.filename === "string" ? body.filename.trim() : undefined;
    const documentTypes = Array.isArray(body?.documentTypes)
      ? body.documentTypes
          .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value: string) => value.trim())
      : [];

    if (!mediaId) {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }

    if (documentTypes.length === 0) {
      return NextResponse.json({ error: "documentTypes is required" }, { status: 400 });
    }

    const results = readResults();
    const entry = results[mediaId];
    if (!entry) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const markdown = extractMarkdownValue(entry.result);
    if (!markdown) {
      return NextResponse.json({ error: "No markdown available for classification" }, { status: 409 });
    }

    const documentType = await classifyDocument(mediaId, markdown, documentTypes, filename);
    return NextResponse.json({ success: true, mediaId, documentType });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Classifier did not answer in time" ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
