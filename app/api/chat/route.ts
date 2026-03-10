import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = path.join(DATA_DIR, "results_data.json");
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
]);
const MARKDOWN_KEYS = new Set(["md", "markdown", "text", "content", "document_text", "documentText", "body"]);
const CONTAINER_KEYS = new Set(["metadata", "extracted_data", "data"]);

type StructuredEntry = { key: string; value: string };
type DocType = "contract" | "invoice" | "act" | "free" | null;

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

function stringifyValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : JSON.stringify(item)))
      .filter(Boolean)
      .join(", ");
  }

  return JSON.stringify(value);
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
    if (MARKDOWN_KEYS.has(key) && typeof value === "string" && value.trim()) {
      return value;
    }
  }

  for (const value of Object.values(source)) {
    const nested = extractMarkdownValue(value, depth + 1);
    if (nested) return nested;
  }

  return null;
}

function flattenEntries(source: unknown, prefix = "", depth = 0): StructuredEntry[] {
  if (!isRecord(source) || depth > 3) return [];

  const entries: StructuredEntry[] = [];

  for (const [key, value] of Object.entries(source)) {
    if (INTERNAL_KEYS.has(key) || MARKDOWN_KEYS.has(key) || CONTAINER_KEYS.has(key)) {
      continue;
    }

    const label = prefix ? `${prefix} / ${key}` : key;

    if (isRecord(value)) {
      entries.push(...flattenEntries(value, label, depth + 1));
      continue;
    }

    const displayValue = stringifyValue(value);
    if (!displayValue) continue;
    entries.push({ key: label, value: displayValue });
  }

  return entries;
}

function getStructuredEntries(data: unknown): StructuredEntry[] {
  const extracted = isRecord(data) ? data.extracted_data : null;
  const metadata = isRecord(data) ? data.metadata : null;
  const nestedData = isRecord(data) ? data.data : null;

  const entries = [
    ...flattenEntries(extracted),
    ...flattenEntries(metadata),
    ...flattenEntries(nestedData),
    ...flattenEntries(data),
  ];

  return entries.filter(
    (entry, index) =>
      entries.findIndex((candidate) => candidate.key === entry.key && candidate.value === entry.value) === index,
  );
}

function cleanMarkdownPreview(markdown: string): string {
  return markdown
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d|table|thead|tbody)>/gi, "\n")
    .replace(/<(p|div|tr|li|h\d|table|thead|tbody)[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/^={2,}\s*(.*?)\s*={2,}$/gm, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractRelevantLines(markdown: string, question: string): string[] {
  const keywords =
    question
      .toLowerCase()
      .match(/[a-zа-яё0-9-]{3,}/gi)
      ?.filter((word) => !["что", "это", "для", "как", "или", "его", "ее", "она", "они", "про", "под", "над", "кто"].includes(word)) || [];

  if (keywords.length === 0) return [];

  return cleanMarkdownPreview(markdown)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword)))
    .slice(0, 4);
}

function getDocTypeLabel(docType: DocType): string | null {
  if (docType === "contract") return "договор";
  if (docType === "invoice") return "счёт-фактура";
  if (docType === "act") return "акт";
  if (docType === "free") return "документ свободного формата";
  return null;
}

function resolveDocType(entry: any, entries: StructuredEntry[]): DocType {
  const explicit = entries.find((item) => /тип документа|documenttype|document type|вид документа/i.test(item.key));
  const value = (explicit?.value || entry?.document?.selectedDocType || "").toLowerCase();
  if (value.includes("договор") || value.includes("contract")) return "contract";
  if (value.includes("счет") || value.includes("счёт") || value.includes("invoice")) return "invoice";
  if (value.includes("акт") || value.includes("act")) return "act";
  if (value) return "free";
  return null;
}

function buildSummaryAnswer(documentName: string, entries: StructuredEntry[], markdown: string | null): string {
  const lead = markdown
    ? cleanMarkdownPreview(markdown)
        .split(/(?<=[.!?])\s+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" ")
    : "";

  const highlights = entries.slice(0, 4).map((entry) => `${entry.key}: ${entry.value}`);

  if (lead && highlights.length > 0) {
    return `Кратко по документу ${documentName}:\n${lead}\n\nКлючевые данные:\n- ${highlights.join("\n- ")}`;
  }

  if (lead) {
    return `Кратко по документу ${documentName}:\n${lead}`;
  }

  if (highlights.length > 0) {
    return `По документу ${documentName} удалось извлечь такие данные:\n- ${highlights.join("\n- ")}`;
  }

  return `По документу ${documentName} доступны только фрагменты распознанного текста без явных метаданных.`;
}

function buildKeyPointsAnswer(entries: StructuredEntry[], markdown: string | null): string {
  const points = entries.slice(0, 5).map((entry) => `- ${entry.key}: ${entry.value}`);
  if (points.length > 0) {
    return `Ключевые тезисы по извлечённым данным:\n${points.join("\n")}`;
  }

  if (markdown) {
    const lines = cleanMarkdownPreview(markdown)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((line) => `- ${line}`);
    return `Ключевые фрагменты текста:\n${lines.join("\n")}`;
  }

  return "Не удалось выделить ключевые тезисы: в документе недостаточно структурированных данных.";
}

function buildAuthorAnswer(entries: StructuredEntry[], markdown: string | null): string {
  const authorPatterns = /(автор|подписант|исполнитель|заказчик|поставщик|подписал|составил)/i;
  const authorEntry = entries.find((entry) => authorPatterns.test(entry.key));

  if (authorEntry) {
    return `В извлечённых данных найдено поле \"${authorEntry.key}\": ${authorEntry.value}`;
  }

  if (markdown) {
    const relevant = extractRelevantLines(markdown, "автор подписант исполнитель заказчик поставщик");
    if (relevant.length > 0) {
      return `В тексте документа нашлись связанные фрагменты:\n- ${relevant.join("\n- ")}`;
    }
  }

  return "Я не нашёл в документе явного указания на автора или подписанта.";
}

function buildDocTypeAnswer(documentName: string, docType: DocType, entries: StructuredEntry[], markdown: string | null): string {
  const explicitType = entries.find((entry) => /тип документа|вид документа|document type/i.test(entry.key));
  const topic = entries.find((entry) => /предмет|тематика|резюме|summary|наименование/i.test(entry.key));
  const docTypeLabel = explicitType?.value || getDocTypeLabel(docType);

  if (docTypeLabel && topic) {
    return `Это ${docTypeLabel}. По извлечённым данным: ${topic.key} — ${topic.value}.`;
  }

  if (docTypeLabel) {
    return `Похоже, это ${docTypeLabel}.`;
  }

  if (markdown) {
    const preview = cleanMarkdownPreview(markdown)
      .split(/(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 1)
      .join(" ");

    if (preview) {
      return `По содержимому ${documentName} это выглядит так: ${preview}`;
    }
  }

  if (entries.length > 0) {
    return `Точный тип документа не выделен, но по извлечённым полям ${documentName} содержит:\n- ${entries
      .slice(0, 3)
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join("\n- ")}`;
  }

  return `Я не смог надёжно определить тип документа ${documentName}.`;
}

function buildAnswer(question: string, documentName: string, docType: DocType, entries: StructuredEntry[], markdown: string | null): string {
  const normalizedQuestion = question.toLowerCase();

  if (/что.*за.*документ|какой.*документ|тип.*документ|что.*это.*документ/.test(normalizedQuestion)) {
    return buildDocTypeAnswer(documentName, docType, entries, markdown);
  }

  if (/кратк.*резюм|summary|о чем|суть|что.*в.*документ/.test(normalizedQuestion)) {
    return buildSummaryAnswer(documentName, entries, markdown);
  }

  if (/ключев|тезис|важн|основн/.test(normalizedQuestion)) {
    return buildKeyPointsAnswer(entries, markdown);
  }

  if (/кто.*автор|кто.*подпис|автор|подписант/.test(normalizedQuestion)) {
    return buildAuthorAnswer(entries, markdown);
  }

  const matchedEntries = entries.filter((entry) => {
    const haystack = `${entry.key} ${entry.value}`.toLowerCase();
    return normalizedQuestion.match(/[a-zа-яё0-9-]{3,}/gi)?.some((token) => haystack.includes(token)) ?? false;
  });

  if (matchedEntries.length > 0) {
    return `По документу ${documentName} нашёл такие релевантные поля:\n- ${matchedEntries
      .slice(0, 4)
      .map((entry) => `${entry.key}: ${entry.value}`)
      .join("\n- ")}`;
  }

  if (markdown) {
    const relevantLines = extractRelevantLines(markdown, question);
    if (relevantLines.length > 0) {
      return `В тексте документа нашёл подходящие фрагменты:\n- ${relevantLines.join("\n- ")}`;
    }
  }

  const fallback = entries.slice(0, 3).map((entry) => `${entry.key}: ${entry.value}`);
  if (fallback.length > 0) {
    return `Прямого ответа на вопрос не нашёл. Сейчас доступны такие данные:\n- ${fallback.join("\n- ")}`;
  }

  return `Я не нашёл достаточно данных в документе, чтобы ответить на вопрос.`;
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
    const entries = getStructuredEntries(entry.result);
    const docType = resolveDocType(entry, entries);
    const documentName = entry?.document?.originalFilename || entry?.document?.filename || mediaId;
    const answer = buildAnswer(question, documentName, docType, entries, markdown);

    return NextResponse.json({ success: true, mediaId, answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError("chat_request_failed", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
