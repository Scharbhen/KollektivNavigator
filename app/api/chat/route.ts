import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import amqp from "amqplib";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = path.join(DATA_DIR, "results_data.json");
const METADATA_QUEUE = process.env.RABBITMQ_METADATA_QUEUE || "doc-2-metadata";
const CHAT_TIMEOUT_MS = Number(process.env.RABBITMQ_CHAT_TIMEOUT_MS || 120000);
const QA_SYSTEM_PROMPT =
  process.env.QA_SYSTEM_PROMPT ||
  "Ты помощник по анализу документов. Отвечай только на основе содержимого документа. Если данных недостаточно, укажи это явно. Верни только JSON объект вида {\"request_id\": \"...\", \"answer\": \"...\"}. request_id бери из запроса и не изменяй.";
const QA_PROMPT_TEMPLATE =
  process.env.QA_PROMPT_TEMPLATE ||
  'request_id="{request_id}". Вопрос пользователя: "{question}". Верни JSON с request_id и answer.';
const QA_ANSWER_KEY = process.env.QA_ANSWER_KEY || "answer";

function logInfo(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", scope: "chat-api", event, ...payload }));
}

function logError(event: string, payload: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", scope: "chat-api", event, ...payload }));
}

function readResults(): Record<string, any> {
  if (!fs.existsSync(RESULTS_FILE)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, "utf-8"));
  } catch (error) {
    logError("results_read_failed", { error: error instanceof Error ? error.message : String(error) });
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
    if (["md", "markdown", "text", "content", "document_text", "documentText", "body"].includes(key) && typeof value === "string" && value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const nested = extractMarkdownValue(value, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function fillPromptTemplate(question: string, requestId: string): string {
  return QA_PROMPT_TEMPLATE.replaceAll("{question}", question).replaceAll("{request_id}", requestId);
}

function toAnswerText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    return text || null;
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => toAnswerText(item)).filter(Boolean);
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (isRecord(value)) {
    const text = JSON.stringify(value, null, 2);
    return text.trim() ? text : null;
  }
  const text = String(value).trim();
  return text || null;
}

function parseMetadataReply(raw: string, requestId: string, mediaId: string): string | null {
  if (!raw.trim()) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logError("chat_response_parse_failed", {
      requestId,
      mediaId,
      rawPreview: raw.slice(0, 500),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  if (parsed?.extraction_error) {
    throw new Error(String(parsed.extraction_error));
  }

  const responseMediaId = parsed?.id ?? parsed?.media_id ?? parsed?.mediaId;
  if (responseMediaId != null && String(responseMediaId) !== mediaId) {
    return null;
  }

  const metadata = isRecord(parsed?.metadata) ? parsed.metadata : null;
  if (!metadata) {
    return null;
  }

  const responseRequestId = metadata.request_id || metadata.requestId;
  if (responseRequestId == null || String(responseRequestId) !== requestId) {
    return null;
  }

  const answer = toAnswerText(metadata[QA_ANSWER_KEY]);
  if (!answer) {
    throw new Error("Extractor returned empty answer");
  }

  return answer;
}

async function askExtractorQuestion(mediaId: string, markdown: string, question: string): Promise<{ requestId: string; answer: string }> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error("RABBITMQ_URL is not set");
  }

  const requestId = randomUUID();
  const payload = {
    md: markdown,
    media_id: mediaId,
    request_id: requestId,
    system_prompt: QA_SYSTEM_PROMPT,
    prompts: [fillPromptTemplate(question, requestId)],
  };

  let connection: amqp.ChannelModel | null = null;
  let channel: amqp.Channel | null = null;
  let consumerTag: string | null = null;

  try {
    connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();
    await channel.checkQueue(METADATA_QUEUE);
    const replyQueue = (await channel.assertQueue("", { exclusive: true, autoDelete: true, durable: false })).queue;

    logInfo("chat_request_started", {
      mediaId,
      metadataQueue: METADATA_QUEUE,
      replyQueue,
      requestId,
    });

    const answer = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Extractor did not answer in time"));
      }, CHAT_TIMEOUT_MS);

      channel!
        .consume(
          replyQueue,
          (msg) => {
            if (!msg) {
              return;
            }

            try {
              const raw = msg.content.toString("utf-8");
              const parsedAnswer = parseMetadataReply(raw, requestId, mediaId);
              if (!parsedAnswer) {
                return;
              }

              clearTimeout(timeout);
              resolve(parsedAnswer);
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
            METADATA_QUEUE,
            Buffer.from(JSON.stringify({ ...payload, reply_queue: replyQueue })),
            { contentType: "application/json" },
          );
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });

    logInfo("chat_request_completed", {
      mediaId,
      metadataQueue: METADATA_QUEUE,
      requestId,
      answerLength: answer.length,
    });

    return { requestId, answer };
  } catch (error) {
    logError("chat_request_failed", {
      mediaId,
      metadataQueue: METADATA_QUEUE,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
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
    const question = typeof body?.question === "string" ? body.question.trim() : "";

    if (!mediaId) {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }

    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const results = readResults();
    const entry = results[mediaId];
    if (!entry) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (entry.status !== "completed") {
      return NextResponse.json({ error: "Document is not ready for questions", status: entry.status }, { status: 409 });
    }

    const markdown = extractMarkdownValue(entry.result);
    if (!markdown) {
      return NextResponse.json({ error: "No markdown context available for this document" }, { status: 409 });
    }

    const { answer, requestId } = await askExtractorQuestion(mediaId, markdown, question);
    return NextResponse.json({ success: true, mediaId, requestId, answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Extractor did not answer in time" ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
