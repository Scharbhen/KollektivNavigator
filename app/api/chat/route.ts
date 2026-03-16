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
const QA_ANSWER_KEY = process.env.QA_ANSWER_KEY || "answer";
const INTERNAL_KEYS = new Set([
  "id",
  "media_id",
  "mediaId",
  "job_id",
  "jobId",
  "file_url",
  "fileUrl",
  "reply_queue",
  "replyQueue",
  "status",
  "pipeline",
  "updatedAt",
  "createdAt",
  "error",
  "extraction_error",
  "documentCard",
  "document",
]);
const MARKDOWN_KEYS = new Set(["md", "markdown", "text", "content", "document_text", "documentText", "body"]);
const CONTAINER_KEYS = new Set(["metadata", "extracted_data"]);

type DocumentFact = { label: string; value: string };
type ChatContext = {
  requestId: string;
  docType: string | null;
  filename: string | null;
  documentSummary: string | null;
  factLines: string[];
};

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

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (isRecord(value)) {
    return JSON.stringify(value);
  }
  return String(value).trim();
}

function normalizeDocTypeValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.includes("contract") || normalized.includes("договор") || normalized.includes("agreement")) {
    return "contract";
  }

  if (
    normalized.includes("invoice") ||
    normalized.includes("счет на оплату") ||
    normalized.includes("счёт на оплату") ||
    normalized.includes("счет") ||
    normalized.includes("счёт") ||
    normalized.includes("счет-фактур") ||
    normalized.includes("счёт-фактур")
  ) {
    return "invoice";
  }

  if (normalized === "act" || normalized.includes("акт")) {
    return "act";
  }

  if (normalized.includes("free") || normalized.includes("свобод")) {
    return "free";
  }

  return value;
}

function getDocTypeLabel(docType: string | null): string | null {
  if (docType === "contract") return "договор";
  if (docType === "invoice") return "счёт или счёт-фактура";
  if (docType === "act") return "акт";
  if (docType === "free") return "документ свободного формата";
  return docType;
}

function normalizeFacts(value: unknown): DocumentFact[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const factValue = typeof item.value === "string" ? item.value.trim() : "";
      if (!label || !factValue) return null;
      return { label, value: factValue };
    })
    .filter(Boolean) as DocumentFact[];
}

function flattenFacts(source: unknown, prefix = "", depth = 0): DocumentFact[] {
  if (!isRecord(source) || depth > 2) return [];

  const facts: DocumentFact[] = [];
  for (const [key, value] of Object.entries(source)) {
    if (INTERNAL_KEYS.has(key) || MARKDOWN_KEYS.has(key) || CONTAINER_KEYS.has(key)) {
      continue;
    }

    const label = prefix ? `${prefix} / ${key}` : key;
    if (isRecord(value)) {
      facts.push(...flattenFacts(value, label, depth + 1));
      continue;
    }

    const factValue = stringifyValue(value);
    if (!factValue) continue;
    facts.push({ label, value: factValue });
  }

  return facts;
}

function dedupeFactLines(facts: DocumentFact[]): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  for (const fact of facts) {
    const line = `${fact.label}: ${fact.value}`.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
  }

  return lines;
}

function buildChatContext(entry: Record<string, any>, requestId: string): ChatContext {
  const card = isRecord(entry.documentCard) ? entry.documentCard : null;
  const documentInfo = isRecord(entry.document) ? entry.document : null;
  const normalizedDocType =
    normalizeDocTypeValue(typeof card?.detectedDocType === "string" ? card.detectedDocType : null) ||
    normalizeDocTypeValue(typeof documentInfo?.selectedDocType === "string" ? documentInfo.selectedDocType : null);
  const summary = typeof card?.summary === "string" && card.summary.trim() ? card.summary.trim() : null;

  const facts = [
    ...normalizeFacts(card?.shortFacts),
    ...normalizeFacts(card?.fullFacts),
    ...flattenFacts(isRecord(entry.result) ? entry.result.extracted_data : null),
    ...flattenFacts(isRecord(entry.result) ? entry.result.metadata : null),
    ...flattenFacts(entry.result),
  ];

  return {
    requestId,
    docType: normalizedDocType,
    filename:
      typeof documentInfo?.originalFilename === "string"
        ? documentInfo.originalFilename
        : typeof documentInfo?.filename === "string"
          ? documentInfo.filename
          : null,
    documentSummary: summary,
    factLines: dedupeFactLines(facts).slice(0, 40),
  };
}

function buildQaSystemPrompt(docType: string | null): string {
  const docTypeLabel = getDocTypeLabel(docType);
  const typeHint = docTypeLabel ? `Тип документа по текущей классификации: ${docTypeLabel}.` : "";
  const invoiceHint =
    docType === "invoice"
      ? "Для счёта или счёта-фактуры в первую очередь ищи: номер и дату, поставщика, покупателя, плательщика, получателя, ИНН/КПП, банковские реквизиты, БИК, расчётный счёт, корреспондентский счёт, суммы с НДС и без НДС, основание и назначение платежа."
      : "";

  return [
    "Ты помощник по анализу документов.",
    typeHint,
    invoiceHint,
    "Тебе даны markdown-текст документа и уже извлечённые факты.",
    "Сначала опирайся на явные факты из структурированного контекста, затем на текст документа.",
    "Если ответ можно извлечь из контекста, не пиши \"данных нет\".",
    "Никогда не отвечай одной фразой \"данных нет\" без пояснения.",
    "Если данных действительно недостаточно, коротко объясни, какого именно реквизита или значения не видно в документе, и укажи ближайшие найденные данные по теме вопроса.",
    "Если вопрос был предложен интерфейсом, а нужного поля в документе нет, всё равно дай полезный ответ: что именно найдено вместо этого и почему прямой ответ невозможен.",
    "Отвечай только на основе переданного документа, ничего не выдумывай.",
    "Верни только JSON объект вида {\"request_id\":\"...\",\"answer\":\"...\"}. request_id бери из запроса и не изменяй.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildQaPrompt(question: string, context: ChatContext): string {
  const contextBlock = context.factLines.length > 0 ? context.factLines.map((line) => `- ${line}`).join("\n") : "- структурированные факты не выделены";
  const summaryBlock = context.documentSummary ? `Краткое summary документа: ${context.documentSummary}` : "";
  const filenameBlock = context.filename ? `Имя файла: ${context.filename}` : "";
  const typeBlock = context.docType ? `Тип документа: ${getDocTypeLabel(context.docType)}` : "";

  return [
    `request_id="${context.requestId}".`,
    filenameBlock,
    typeBlock,
    summaryBlock,
    "Структурированные факты по документу:",
    contextBlock,
    `Вопрос пользователя: "${question}".`,
    "Сформулируй короткий точный ответ по-русски.",
    "Если в документе есть несколько релевантных значений, перечисли их.",
    "Если вопрос про реквизиты банка, верни именно реквизиты банка списком или одной фразой.",
    "Если вопрос про суммы, явно различай сумму без НДС, НДС и итоговую сумму.",
    "Если прямого ответа нет, не пиши только \"данных нет\". Напиши, какого поля не хватает, и добавь 1-2 найденных рядом факта из документа.",
    "Верни только JSON с полями request_id и answer.",
  ]
    .filter(Boolean)
    .join("\n");
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

async function askExtractorQuestion(
  mediaId: string,
  markdown: string,
  question: string,
  context: ChatContext,
): Promise<{ requestId: string; answer: string }> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error("RABBITMQ_URL is not set");
  }

  const requestId = context.requestId;
  const payload = {
    md: markdown,
    media_id: mediaId,
    request_id: requestId,
    system_prompt: buildQaSystemPrompt(context.docType),
    prompts: [buildQaPrompt(question, context)],
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

    const requestId = randomUUID();
    const context = buildChatContext(entry, requestId);
    const { answer } = await askExtractorQuestion(mediaId, markdown, question, context);
    return NextResponse.json({ success: true, mediaId, requestId, answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Extractor did not answer in time" ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
