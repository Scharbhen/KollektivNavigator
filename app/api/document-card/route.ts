import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import amqp from "amqplib";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = path.join(DATA_DIR, "results_data.json");
const METADATA_QUEUE = process.env.RABBITMQ_METADATA_QUEUE || "doc-2-metadata";
const CARD_TIMEOUT_MS = Number(process.env.RABBITMQ_CHAT_TIMEOUT_MS || 120000);

type DocumentFact = { label: string; value: string };
type DocumentCard = {
  detectedDocType: string | null;
  summary: string;
  shortFacts: DocumentFact[];
  fullFacts: DocumentFact[];
};

function logInfo(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", scope: "document-card-api", event, ...payload }));
}

function logError(event: string, payload: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", scope: "document-card-api", event, ...payload }));
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

function writeResults(results: Record<string, any>) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function isRecord(value: unknown): value is Record<string, any> {
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

function normalizeCard(metadata: Record<string, any>): DocumentCard {
  const summary = typeof metadata.summary === "string" && metadata.summary.trim()
    ? metadata.summary.trim()
    : "Карточка документа собрана.";

  return {
    detectedDocType:
      typeof metadata.detected_doc_type === "string"
        ? metadata.detected_doc_type
        : typeof metadata.detectedDocType === "string"
          ? metadata.detectedDocType
          : null,
    summary,
    shortFacts: normalizeFacts(metadata.short_facts ?? metadata.shortFacts),
    fullFacts: normalizeFacts(metadata.full_facts ?? metadata.fullFacts),
  };
}

function buildCardPrompt(docType: string | null, filename: string | null, requestId: string): { systemPrompt: string; prompt: string } {
  const docTypeHint = docType ? `Ожидаемый тип документа: ${docType}.` : "Тип документа заранее неизвестен, определи его по тексту.";
  const fileHint = filename ? `Имя файла: ${filename}.` : "";

  const systemPrompt = [
    "Ты извлекаешь карточку документа из markdown-текста.",
    "Отвечай только JSON-объектом.",
    "Не выдумывай реквизиты. Если значения нет, не включай поле или возвращай пустой массив для соответствующего блока.",
    "Верни JSON вида {\"request_id\":\"...\",\"detected_doc_type\":\"contract|invoice|act|free\",\"summary\":\"...\",\"short_facts\":[{\"label\":\"...\",\"value\":\"...\"}],\"full_facts\":[{\"label\":\"...\",\"value\":\"...\"}] }.",
    "short_facts: 3-4 самых важных реквизита для левой карточки.",
    "full_facts: 6-10 реквизитов для полной карточки.",
    "summary: 1-3 коротких предложения для стартового сообщения в чате.",
    "request_id бери из запроса и не изменяй."
  ].join(" ");

  const prompt = [
    `request_id=\"${requestId}\".`,
    fileHint,
    docTypeHint,
    "Собери карточку документа для интерфейса пользователя.",
    "Для договора старайся выделить: реквизиты договора, заказчик, исполнитель, предмет, сумма, срок действия, условия оплаты.",
    "Для счета-фактуры: номер, дата, продавец, покупатель, ИНН/КПП, суммы, основание.",
    "Для акта: номер, дата, исполнитель, заказчик, основание, период, сумма, статус подписания.",
    "Если тип свободный, дай краткое понятное summary и 4-6 полезных фактов.",
    "Верни только JSON."
  ].filter(Boolean).join(" ");

  return { systemPrompt, prompt };
}

function parseMetadataReply(raw: string, requestId: string, mediaId: string): DocumentCard | null {
  if (!raw.trim()) {
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logError("document_card_parse_failed", {
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

  return normalizeCard(metadata);
}

async function requestDocumentCard(mediaId: string, markdown: string, docType: string | null, filename: string | null): Promise<DocumentCard> {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    throw new Error("RABBITMQ_URL is not set");
  }

  const requestId = randomUUID();
  const { systemPrompt, prompt } = buildCardPrompt(docType, filename, requestId);
  const payload = {
    md: markdown,
    media_id: mediaId,
    request_id: requestId,
    system_prompt: systemPrompt,
    prompts: [prompt],
  };

  let connection: amqp.ChannelModel | null = null;
  let channel: amqp.Channel | null = null;
  let consumerTag: string | null = null;

  try {
    connection = await amqp.connect(rabbitUrl);
    channel = await connection.createChannel();
    await channel.checkQueue(METADATA_QUEUE);
    const replyQueue = (await channel.assertQueue("", { exclusive: true, autoDelete: true, durable: false })).queue;

    logInfo("document_card_requested", { mediaId, requestId, metadataQueue: METADATA_QUEUE, replyQueue });

    const card = await new Promise<DocumentCard>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Extractor did not return document card in time")), CARD_TIMEOUT_MS);

      channel!
        .consume(
          replyQueue,
          (msg) => {
            if (!msg) return;
            try {
              const raw = msg.content.toString("utf-8");
              const parsed = parseMetadataReply(raw, requestId, mediaId);
              if (!parsed) return;
              clearTimeout(timeout);
              resolve(parsed);
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
            }
          },
          { noAck: true },
        )
        .then((consumeOk) => {
          consumerTag = consumeOk.consumerTag;
          channel!.sendToQueue(METADATA_QUEUE, Buffer.from(JSON.stringify({ ...payload, reply_queue: replyQueue })), {
            contentType: "application/json",
          });
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });

    logInfo("document_card_received", {
      mediaId,
      requestId,
      shortFacts: card.shortFacts.length,
      fullFacts: card.fullFacts.length,
    });
    return card;
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
    const docType = typeof body?.docType === "string" ? body.docType.trim() : null;
    const filename = typeof body?.filename === "string" ? body.filename.trim() : null;
    const forceRefresh = body?.forceRefresh === true;

    if (!mediaId) {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }

    const results = readResults();
    const entry = results[mediaId];
    if (!entry) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (entry.status !== "completed") {
      return NextResponse.json({ error: "Document is not ready for card extraction", status: entry.status }, { status: 409 });
    }

    if (!forceRefresh && isRecord(entry.documentCard)) {
      return NextResponse.json({ success: true, mediaId, card: entry.documentCard });
    }

    const markdown = extractMarkdownValue(entry.result);
    if (!markdown) {
      return NextResponse.json({ error: "No markdown context available for this document" }, { status: 409 });
    }

    const card = await requestDocumentCard(
      mediaId,
      markdown,
      docType || entry?.document?.selectedDocType || null,
      filename || entry?.document?.originalFilename || entry?.document?.filename || null,
    );

    results[mediaId] = {
      ...entry,
      documentCard: card,
      updatedAt: new Date().toISOString(),
    };
    writeResults(results);

    return NextResponse.json({ success: true, mediaId, card });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Extractor did not return document card in time" ? 504 : 500;
    logError("document_card_failed", { error: message });
    return NextResponse.json({ error: message }, { status });
  }
}
