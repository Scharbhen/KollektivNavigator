"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  Send,
  ChevronRight,
  FileDigit,
  FileSpreadsheet,
  FileQuestion,
} from "lucide-react";

type Step = "email" | "upload" | "processing" | "result";
type DocType = "contract" | "invoice" | "act" | "free" | null;
type PipelineMode = "demo" | "real" | null;
type ChatMessage = { role: "user" | "ai"; text: string };
type StructuredEntry = { key: string; value: string };
type DocumentFact = { label: string; value: string };
type DocumentInfo = {
  mediaId?: string;
  filename?: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  selectedDocType?: string | null;
} | null;

const DOC_TYPES = [
  { id: "contract", label: "Договор", icon: FileText, desc: "Извлечение сторон, сумм, сроков" },
  { id: "invoice", label: "Счет-фактура", icon: FileDigit, desc: "ИНН, КПП, суммы с НДС" },
  { id: "act", label: "Акт", icon: FileSpreadsheet, desc: "Позиции, подписанты, суммы" },
  { id: "free", label: "Свободный формат", icon: FileQuestion, desc: "Краткое резюме (Summary)" },
] as const;

const DEMO_DOCUMENT_TYPES = DOC_TYPES.map((type) => type.label);

const QUICK_PROMPTS = {
  contract: ["Какие здесь штрафные санкции?", "Как расторгнуть этот договор?", "Каковы сроки оплаты?"],
  invoice: ["Совпадают ли суммы с НДС и без?", "Кто плательщик?", "Укажи реквизиты банка"],
  act: ["Совпадают ли суммы в тексте?", "Кто подписант?", "Какие услуги оказаны?"],
  free: ["Составь краткое резюме документа", "Выдели ключевые тезисы", "Кто автор документа?"],
};

const MOCK_METADATA = {
  contract: {
    "Номер договора": "12/24",
    "Дата договора": "15.01.2026",
    "Заказчик": "ООО «Альфа»",
    "Исполнитель": "ИП Иванов И.И.",
    "Предмет договора": "Оказание консультационных услуг",
    "Сумма договора": "1 500 000 руб.",
    "Срок действия": "до 31.12.2026",
    "Условия оплаты": "Постоплата 30 дней",
    "Штрафные санкции": "0,1% за каждый день просрочки",
    "Подсудность": "Арбитражный суд г. Москвы",
  },
  invoice: {
    "Номер счета-фактуры": "458",
    "Дата счета-фактуры": "20.02.2026",
    "Продавец": "ООО «ТехРешения»",
    "Покупатель": "ПАО «МегаКорп»",
    "ИНН продавца": "7701234567",
    "КПП продавца": "770101001",
    "Сумма без НДС": "1 000 000 руб.",
    "Сумма НДС (20%)": "200 000 руб.",
    "Итого с НДС": "1 200 000 руб.",
    "Основание": "Договор №12/24 от 15.01.2026",
  },
  act: {
    "Номер акта": "17",
    "Дата акта": "28.02.2026",
    "Исполнитель": "ООО «ТехРешения»",
    "Заказчик": "ПАО «МегаКорп»",
    "Основание": "Договор №12/24 от 15.01.2026",
    "Период услуг": "Февраль 2026",
    "Общая сумма": "500 000 руб.",
    "Статус подписания": "Подписано обеими сторонами",
    "Замечания": "Отсутствуют",
  },
  free: {
    "Тип документа": "Внутренний регламент",
    "Тематика": "Информационная безопасность",
    "Автор": "Отдел ИБ",
    "Резюме": "Документ описывает правила доступа к корпоративным серверам и политику паролей.",
  },
};

const PROCESSING_LOGS = [
  "Инициализация OCR-движка...",
  "Распознавание текстового слоя...",
  "Извлечение реквизитов и сущностей...",
  "Построение семантических связей...",
  "Индексация в векторной базе данных...",
  "Формирование метаданных...",
  "Готово.",
];

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
const CONTAINER_KEYS = new Set(["metadata", "extracted_data"]);

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
  if (!source || depth > 3) return null;
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
  if (!isRecord(source) || depth > 2) return [];

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

function getStructuredEntries(data: unknown, docType: Exclude<DocType, null>, pipelineMode: PipelineMode): StructuredEntry[] {
  const extracted = isRecord(data) ? data.extracted_data : null;
  const metadata = isRecord(data) ? data.metadata : null;

  const entries = [
    ...flattenEntries(extracted),
    ...flattenEntries(metadata),
    ...flattenEntries(data),
  ];

  const deduped = entries.filter(
    (entry, index) =>
      entries.findIndex((candidate) => candidate.key === entry.key && candidate.value === entry.value) === index,
  );

  if (deduped.length > 0) {
    return deduped;
  }

  if (pipelineMode === "demo") {
    return Object.entries(MOCK_METADATA[docType]).map(([key, value]) => ({ key, value }));
  }

  return [];
}

function normalizeDocTypeValue(value: string | null | undefined): Exclude<DocType, null> | null {
  if (!value) return null;

  const normalized = value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized.includes("contract") ||
    normalized.includes("договор") ||
    normalized.includes("agreement")
  ) {
    return "contract";
  }

  if (
    normalized.includes("invoice") ||
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

  return null;
}

function extractDetectedDocType(source: unknown): Exclude<DocType, null> | null {
  if (!source) return null;

  if (typeof source === "string") {
    return normalizeDocTypeValue(source);
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const detected = extractDetectedDocType(item);
      if (detected) return detected;
    }
    return null;
  }

  if (!isRecord(source)) {
    return null;
  }

  for (const [key, value] of Object.entries(source)) {
    if (/(document.?type|doc.?type|тип документа|вид документа)/i.test(key) && typeof value === "string") {
      const detected = normalizeDocTypeValue(value);
      if (detected) return detected;
    }
  }

  for (const value of Object.values(source)) {
    const detected = extractDetectedDocType(value);
    if (detected) return detected;
  }

  return null;
}

function findEntryValue(
  entries: StructuredEntry[],
  include: RegExp[],
  exclude: RegExp[] = [],
): string | null {
  for (const entry of entries) {
    const key = entry.key.toLowerCase();
    if (include.some((pattern) => pattern.test(key)) && !exclude.some((pattern) => pattern.test(key))) {
      return entry.value;
    }
  }

  return null;
}

function shortenPartyName(value: string | null, maxLength = 28): string | null {
  if (!value) return null;

  const compact = value
    .replace(/Общество с ограниченной ответственностью/gi, "ООО")
    .replace(/Публичное акционерное общество/gi, "ПАО")
    .replace(/Акционерное общество/gi, "АО")
    .replace(/Индивидуальный предприниматель/gi, "ИП")
    .replace(/\s+/g, " ")
    .trim();

  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatReference(number: string | null, date: string | null): string | null {
  if (number && date) return `№${number.replace(/^№\s*/i, "")} от ${date}`;
  if (number) return `№${number.replace(/^№\s*/i, "")}`;
  return date;
}

function buildDocumentSummaryFacts(
  docType: Exclude<DocType, null>,
  entries: StructuredEntry[],
  documentName: string,
): DocumentFact[] {
  const contractNumber = findEntryValue(entries, [/номер.*договор/i, /^номер$/i, /^№$/i]);
  const contractDate = findEntryValue(entries, [/дата.*договор/i, /^дата$/i]);
  const contractCustomer = shortenPartyName(findEntryValue(entries, [/заказчик/i]));
  const contractExecutor = shortenPartyName(findEntryValue(entries, [/исполнител/i]));
  const contractAmount = findEntryValue(
    entries,
    [/сумма договора/i, /цена договора/i, /общая сумма/i, /сумма/i],
    [/без ндс/i, /ндс/i],
  );

  const invoiceNumber = findEntryValue(entries, [/номер.*сч/i, /^номер$/i, /^№$/i]);
  const invoiceDate = findEntryValue(entries, [/дата.*сч/i, /^дата$/i]);
  const invoiceSeller = shortenPartyName(findEntryValue(entries, [/продавец/i, /поставщик/i]));
  const invoiceBuyer = shortenPartyName(findEntryValue(entries, [/покупател/i, /заказчик/i]));
  const invoiceTotal = findEntryValue(entries, [/итого.*ндс/i, /сумма с ндс/i, /стоимость с ндс/i, /всего к оплате/i, /итого/i]);

  const actNumber = findEntryValue(entries, [/номер.*акт/i, /^номер$/i, /^№$/i]);
  const actDate = findEntryValue(entries, [/дата.*акт/i, /^дата$/i]);
  const actExecutor = shortenPartyName(findEntryValue(entries, [/исполнител/i]));
  const actCustomer = shortenPartyName(findEntryValue(entries, [/заказчик/i]));
  const actTotal = findEntryValue(entries, [/общая сумма/i, /сумма акта/i, /итого/i, /сумма/i], [/без ндс/i, /ндс/i]);

  if (docType === "contract") {
    return [
      { label: "Реквизиты", value: formatReference(contractNumber, contractDate) || documentName },
      { label: "Заказчик", value: contractCustomer || "Не найден" },
      { label: "Исполнитель", value: contractExecutor || "Не найден" },
      { label: "Сумма", value: contractAmount || "Не найдена" },
    ];
  }

  if (docType === "invoice") {
    return [
      { label: "Реквизиты", value: formatReference(invoiceNumber, invoiceDate) || documentName },
      { label: "Продавец", value: invoiceSeller || "Не найден" },
      { label: "Покупатель", value: invoiceBuyer || "Не найден" },
      { label: "Итого", value: invoiceTotal || "Не найдено" },
    ];
  }

  if (docType === "act") {
    return [
      { label: "Реквизиты", value: formatReference(actNumber, actDate) || documentName },
      { label: "Исполнитель", value: actExecutor || "Не найден" },
      { label: "Заказчик", value: actCustomer || "Не найден" },
      { label: "Сумма", value: actTotal || "Не найдена" },
    ];
  }

  return entries.slice(0, 4).map((entry) => ({
    label: entry.key,
    value: entry.value,
  }));
}

function buildFullCardFacts(
  docType: Exclude<DocType, null>,
  entries: StructuredEntry[],
  documentName: string,
): DocumentFact[] {
  if (docType === "contract") {
    return [
      { label: "Номер договора", value: findEntryValue(entries, [/номер.*договор/i, /^номер$/i, /^№$/i]) || "Не найден" },
      { label: "Дата договора", value: findEntryValue(entries, [/дата.*договор/i, /^дата$/i]) || "Не найдена" },
      { label: "Заказчик", value: findEntryValue(entries, [/заказчик/i]) || "Не найден" },
      { label: "Исполнитель", value: findEntryValue(entries, [/исполнител/i]) || "Не найден" },
      { label: "Предмет", value: findEntryValue(entries, [/предмет/i, /наименование/i, /описани/i]) || "Не найден" },
      { label: "Сумма", value: findEntryValue(entries, [/сумма договора/i, /цена договора/i, /общая сумма/i, /сумма/i], [/без ндс/i, /ндс/i]) || "Не найдена" },
      { label: "Срок действия", value: findEntryValue(entries, [/срок действия/i, /срок/i, /действует до/i]) || "Не найден" },
      { label: "Условия оплаты", value: findEntryValue(entries, [/условия оплаты/i, /срок оплаты/i, /оплата/i]) || "Не найдены" },
    ];
  }

  if (docType === "invoice") {
    return [
      { label: "Номер счета-фактуры", value: findEntryValue(entries, [/номер.*сч/i, /^номер$/i, /^№$/i]) || "Не найден" },
      { label: "Дата счета-фактуры", value: findEntryValue(entries, [/дата.*сч/i, /^дата$/i]) || "Не найдена" },
      { label: "Продавец", value: findEntryValue(entries, [/продавец/i, /поставщик/i]) || "Не найден" },
      { label: "Покупатель", value: findEntryValue(entries, [/покупател/i, /заказчик/i]) || "Не найден" },
      { label: "ИНН продавца", value: findEntryValue(entries, [/инн.*продав/i, /инн.*постав/i, /^инн$/i]) || "Не найден" },
      { label: "КПП продавца", value: findEntryValue(entries, [/кпп.*продав/i, /кпп.*постав/i, /^кпп$/i]) || "Не найден" },
      { label: "Сумма без НДС", value: findEntryValue(entries, [/без ндс/i]) || "Не найдена" },
      { label: "НДС", value: findEntryValue(entries, [/ндс/i], [/без ндс/i, /сумма с ндс/i, /итого/i]) || "Не найден" },
      { label: "Итого с НДС", value: findEntryValue(entries, [/итого.*ндс/i, /сумма с ндс/i, /стоимость с ндс/i, /всего к оплате/i, /итого/i]) || "Не найдено" },
      { label: "Основание", value: findEntryValue(entries, [/основание/i, /договор/i]) || "Не найдено" },
    ];
  }

  if (docType === "act") {
    return [
      { label: "Номер акта", value: findEntryValue(entries, [/номер.*акт/i, /^номер$/i, /^№$/i]) || "Не найден" },
      { label: "Дата акта", value: findEntryValue(entries, [/дата.*акт/i, /^дата$/i]) || "Не найдена" },
      { label: "Исполнитель", value: findEntryValue(entries, [/исполнител/i]) || "Не найден" },
      { label: "Заказчик", value: findEntryValue(entries, [/заказчик/i]) || "Не найден" },
      { label: "Основание", value: findEntryValue(entries, [/основание/i, /договор/i]) || "Не найдено" },
      { label: "Период услуг", value: findEntryValue(entries, [/период/i]) || "Не найден" },
      { label: "Общая сумма", value: findEntryValue(entries, [/общая сумма/i, /сумма акта/i, /итого/i, /сумма/i], [/без ндс/i, /ндс/i]) || "Не найдена" },
      { label: "Статус подписания", value: findEntryValue(entries, [/статус подписания/i, /подписан/i]) || "Не найден" },
      { label: "Замечания", value: findEntryValue(entries, [/замечани/i]) || "Не найдены" },
    ];
  }

  return [
    { label: "Документ", value: documentName },
    ...entries.slice(0, 6).map((entry) => ({ label: entry.key, value: entry.value })),
  ];
}

function buildInitialAssistantMessage({
  documentName,
  docType,
  selectedDocType,
  entries,
}: {
  documentName: string;
  docType: Exclude<DocType, null>;
  selectedDocType?: string | null;
  entries: StructuredEntry[];
}): string {
  const selectedType = normalizeDocTypeValue(selectedDocType);
  const autoSwitched = Boolean(selectedType && selectedType !== docType);
  const fullCardFacts = buildFullCardFacts(docType, entries, documentName).filter(
    (fact) => fact.value && !/^Не найден/i.test(fact.value),
  );
  const intro = autoSwitched
    ? `Тип документа определен автоматически: ${getDocTypeLabel(docType)}. Переключил карточку на нужный тип.`
    : `Документ обработан. Это ${getDocTypeLabel(docType)}.`;

  if (fullCardFacts.length === 0) {
    return `${intro}\n\nПолную карточку пока собрать не удалось: экстрактор не вернул уверенные реквизиты.`;
  }

  return `${intro}\n\nВот реквизиты по документу ${documentName}:\n- ${fullCardFacts
    .slice(0, 10)
    .map((fact) => `${fact.label}: ${fact.value}`)
    .join("\n- ")}`;
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
  const keywords = question
    .toLowerCase()
    .match(/[a-zа-яё0-9-]{3,}/gi)?.filter((word) => !["что", "это", "для", "как", "или", "его", "ее", "она", "они", "про", "под", "над", "кто"].includes(word)) || [];

  if (keywords.length === 0) return [];

  return cleanMarkdownPreview(markdown)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword)))
    .slice(0, 3);
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

  return `По документу ${documentName} пока доступны только сырые результаты распознавания без явных метаданных.`;
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

  return "Не удалось выделить ключевые тезисы: в ответе экстрактора недостаточно структурированных данных.";
}

function buildAuthorAnswer(entries: StructuredEntry[], markdown: string | null): string {
  const authorPatterns = /(автор|подписант|исполнитель|заказчик|поставщик|подписал|составил)/i;
  const authorEntry = entries.find((entry) => authorPatterns.test(entry.key));

  if (authorEntry) {
    return `В извлечённых данных найдено поле "${authorEntry.key}": ${authorEntry.value}`;
  }

  if (markdown) {
    const relevant = extractRelevantLines(markdown, "автор подписант исполнитель заказчик поставщик");
    if (relevant.length > 0) {
      return `В тексте документа нашлись связанные фрагменты:\n- ${relevant.join("\n- ")}`;
    }
  }

  return "Я не нашёл в извлечённых данных явного указания на автора или подписанта документа.";
}

function getDocTypeLabel(docType: DocType): string | null {
  if (docType === "contract") return "договор";
  if (docType === "invoice") return "счёт-фактура";
  if (docType === "act") return "акт";
  if (docType === "free") return "документ свободного формата";
  return null;
}

function buildDocTypeAnswer(
  documentName: string,
  docType: DocType,
  entries: StructuredEntry[],
  markdown: string | null,
): string {
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

  return `Я не смог надёжно определить тип документа ${documentName} по ответу экстрактора.`;
}

function buildAnswerFromExtractor(
  question: string,
  documentName: string,
  docType: DocType,
  entries: StructuredEntry[],
  markdown: string | null,
): string {
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
    return normalizedQuestion
      .match(/[a-zа-яё0-9-]{3,}/gi)
      ?.some((token) => haystack.includes(token)) ?? false;
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
    return `Прямого ответа на вопрос в извлечённых полях не нашёл. Сейчас доступны такие данные:\n- ${fallback.join("\n- ")}`;
  }

  return `Я не нашёл достаточно данных в ответе экстрактора, чтобы ответить на вопрос по документу ${documentName}.`;
}

export function InteractiveDemo({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [docType, setDocType] = useState<DocType>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo>(null);
  const [processingLogIndex, setProcessingLogIndex] = useState(0);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const structuredEntries = docType ? getStructuredEntries(extractedData, docType, pipelineMode) : [];
  const markdownPreview = extractedData ? extractMarkdownValue(extractedData) : null;

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep("email");
      setEmail("");
      setEmailError("");
      setDocType(null);
      setFile(null);
      setMediaId(null);
      setDocumentInfo(null);
      setProcessingLogIndex(0);
      setExtractedData(null);
      setPipelineMode(null);
      setProcessingError(null);
      setChatHistory([]);
      setChatInput("");
    }
  }, [isOpen]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiTyping]);

  const finalizeProcessing = ({
    nextExtractedData,
    nextDocumentInfo,
    nextPipelineMode,
  }: {
    nextExtractedData: unknown;
    nextDocumentInfo: DocumentInfo;
    nextPipelineMode: PipelineMode;
  }) => {
    const resolvedDocType =
      extractDetectedDocType(nextExtractedData) ||
      normalizeDocTypeValue(nextDocumentInfo?.selectedDocType) ||
      docType ||
      "free";

    if (resolvedDocType !== docType) {
      setDocType(resolvedDocType);
    }

    const entries = getStructuredEntries(nextExtractedData, resolvedDocType, nextPipelineMode);
    const nextDocumentName = nextDocumentInfo?.originalFilename || file?.name || "документ";
    const initialMessage = buildInitialAssistantMessage({
      documentName: nextDocumentName,
      docType: resolvedDocType,
      selectedDocType: nextDocumentInfo?.selectedDocType,
      entries,
    });

    setTimeout(() => {
      setStep("result");
      setChatHistory([
        {
          role: "ai",
          text: initialMessage,
        },
      ]);
    }, 1000);
  };

  const classifyDocumentType = async (nextMediaId: string, filename?: string): Promise<string | null> => {
    const response = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mediaId: nextMediaId,
        filename,
        documentTypes: DEMO_DOCUMENT_TYPES,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.success || typeof payload.documentType !== "string") {
      throw new Error(payload?.error || `Не удалось классифицировать документ (${response.status})`);
    }

    return payload.documentType;
  };

  const handleEmailSubmit = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Введите корректный email");
      return;
    }
    setEmailError("");
    
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "demo_start",
        }),
      });
    } catch (e) {
      console.error("Failed to save lead:", e);
    }

    setStep("upload");
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (!docType) return;
    setFile(selectedFile);
    setProcessingError(null);
    setStep("processing");

    // Upload file
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("email", email);
      if (docType) {
        formData.append("docType", docType);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.details || result.error || "Upload failed");
      }

      const nextMode: PipelineMode = result.pipelineMode === "demo" ? "demo" : "real";
      setPipelineMode(nextMode);
      setMediaId(result.mediaId || null);
      setDocumentInfo(result.document || null);

      if (nextMode === "demo") {
        simulateProcessing(result.document || null);
        return;
      }

      pollResults(result.mediaId);
    } catch (e) {
      console.error("Failed to upload file:", e);
      setProcessingError(
        e instanceof Error
          ? `Не удалось поставить задачу в очередь экстрактора: ${e.message}`
          : "Не удалось поставить задачу в очередь экстрактора",
      );
    }
  };

  const pollResults = async (mediaId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    const interval = setInterval(async () => {
      try {
        attempts++;
        const res = await fetch(`/api/results?mediaId=${mediaId}`);
        const data = await res.json();
        
        if (res.status === 404 && attempts < 6) {
          return;
        }

        if (data.status === "queued" || data.status === "processing") {
          if (data.document) {
            setDocumentInfo(data.document);
          }
          // Update logs based on attempts to show progress
          setProcessingLogIndex(Math.min(PROCESSING_LOGS.length - 2, Math.floor(attempts / 2)));
        } else if (data.status === "completed") {
          clearInterval(interval);
          setProcessingLogIndex(PROCESSING_LOGS.length - 1);
          const nextDocumentInfo = data.document || documentInfo;
          let nextExtractedData = data.result || null;
          if (nextDocumentInfo) {
            setDocumentInfo(nextDocumentInfo);
          }

          try {
            const classifiedType = await classifyDocumentType(
              mediaId,
              nextDocumentInfo?.originalFilename || file?.name,
            );
            if (classifiedType && isRecord(nextExtractedData)) {
              nextExtractedData = {
                ...nextExtractedData,
                documentType: classifiedType,
              };
            }
          } catch (error) {
            console.error("Classification error:", error);
          }

          setExtractedData(nextExtractedData);
          finalizeProcessing({
            nextExtractedData,
            nextDocumentInfo,
            nextPipelineMode: "real",
          });
        } else if (data.status === "failed" || data.status === "error" || data.status === "publish_failed") {
          clearInterval(interval);
          if (data.document) {
            setDocumentInfo(data.document);
          }
          setProcessingError(data.error || "Экстрактор вернул ошибку обработки");
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setProcessingError("Превышено время ожидания ответа экстрактора");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 5000);
  };

  const simulateProcessing = (nextDocumentInfo: DocumentInfo) => {
    let currentLog = 0;
    const interval = setInterval(() => {
      currentLog++;
      setProcessingLogIndex(currentLog);
      if (currentLog >= PROCESSING_LOGS.length - 1) {
        clearInterval(interval);
        finalizeProcessing({
          nextExtractedData: null,
          nextDocumentInfo,
          nextPipelineMode: "demo",
        });
      }
    }, 800);
  };

  const handleSendMessage = async (text: string) => {
    const question = text.trim();
    if (!question) return;

    setChatHistory((prev) => [...prev, { role: "user", text: question }]);
    setChatInput("");
    setIsAiTyping(true);

    try {
      const documentName = documentInfo?.originalFilename || file?.name || "документ";
      const activeDocType = docType || normalizeDocTypeValue(documentInfo?.selectedDocType) || "free";
      const answer =
        pipelineMode === "demo"
          ? buildAnswerFromExtractor(question, documentName, activeDocType, structuredEntries, markdownPreview)
          : await (async () => {
              if (!mediaId) {
                throw new Error("Не найден идентификатор документа для запроса к экстрактору");
              }

              const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mediaId, question }),
              });

              const raw = await response.text();
              let payload: any = null;
              try {
                payload = raw ? JSON.parse(raw) : null;
              } catch {
                throw new Error(`Сервер вернул не-JSON ответ (${response.status})`);
              }

              if (!response.ok || !payload?.success || typeof payload.answer !== "string" || !payload.answer.trim()) {
                throw new Error(payload?.error || `Не удалось получить ответ экстрактора (${response.status})`);
              }

              return payload.answer as string;
            })();

      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          text: answer,
        },
      ]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            error instanceof Error
              ? `Не удалось получить ответ по документу: ${error.message}`
              : "Не удалось получить ответ по документу",
        },
      ]);
    } finally {
      setIsAiTyping(false);
    }
  };

  if (!isOpen) return null;

  const documentName = documentInfo?.originalFilename || file?.name || "document.pdf";
  const activeDocType = docType || normalizeDocTypeValue(documentInfo?.selectedDocType);
  const documentCardFacts = activeDocType
    ? buildDocumentSummaryFacts(activeDocType, structuredEntries, documentName)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col relative transition-all duration-500 ${
          step === "result" ? "w-full max-w-6xl h-[85vh]" : "w-full max-w-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            {step === "email" && "Интерактивный разбор документов"}
            {step === "upload" && "Загрузка документа"}
            {step === "processing" && "Анализ документа"}
            {step === "result" && "Результаты анализа"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* STEP 1: Email */}
            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Протестируйте на своем документе
                  </h3>
                  <p className="text-slate-600">
                    Введите ваш рабочий email, чтобы мы могли отправить вам полный отчет о разборе после тестирования.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      Рабочий Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEmailSubmit(e);
                        }
                      }}
                      placeholder="name@company.com"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        emailError ? "border-red-300 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"
                      } focus:outline-none focus:ring-2 focus:border-transparent transition-shadow text-slate-900`}
                    />
                    {emailError && <p className="mt-1 text-sm text-red-500">{emailError}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={handleEmailSubmit}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Продолжить <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Upload */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-8 flex flex-col h-full"
              >
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">1. Выберите тип документа</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {DOC_TYPES.map((type) => {
                      const Icon = type.icon;
                      const isSelected = docType === type.id;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setDocType(type.id)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                              : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${isSelected ? "text-indigo-600" : "text-slate-500"}`} />
                          <div className={`font-medium ${isSelected ? "text-indigo-900" : "text-slate-900"}`}>
                            {type.label}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{type.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">2. Загрузите файл</h3>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={`flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors ${
                      !docType
                        ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                        : isDragging
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50 cursor-pointer"
                    }`}
                    onClick={() => docType && fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      disabled={!docType}
                    />
                    <UploadCloud className={`w-10 h-10 mb-3 ${docType ? "text-indigo-500" : "text-slate-400"}`} />
                    <p className="text-slate-900 font-medium mb-1">
                      {docType ? "Нажмите для загрузки или перетащите файл" : "Сначала выберите тип документа"}
                    </p>
                    <p className="text-sm text-slate-500">PDF, DOCX, JPG, PNG (до 10 МБ)</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Processing */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]"
              >
                {processingError ? (
                  <div className="w-full max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-left">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Реальный сценарий не запустился</h3>
                    <p className="text-sm text-red-800 mb-4">{processingError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessingError(null);
                        setStep("upload");
                      }}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    >
                      Вернуться к загрузке
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative w-24 h-24 mb-8">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
                        <FileText className="w-8 h-8" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-6">
                      ИИ Коллектив анализирует структуру...
                    </h3>

                    <div className="w-full max-w-md bg-slate-50 rounded-lg p-4 font-mono text-sm text-left border border-slate-100">
                      {PROCESSING_LOGS.map((log, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 py-1 transition-opacity duration-300 ${
                            index === processingLogIndex
                              ? "text-indigo-600 opacity-100"
                              : index < processingLogIndex
                              ? "text-slate-400 opacity-70"
                              : "opacity-0 hidden"
                          }`}
                        >
                          {index < processingLogIndex ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : index === processingLogIndex ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : null}
                          {log}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 4: Result */}
            {step === "result" && activeDocType && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col md:flex-row h-full"
              >
                {/* Left Panel: Metadata */}
                <div className="w-full md:w-1/3 border-r border-slate-100 bg-slate-50/50 flex flex-col h-full overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-white">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Карточка документа
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 truncate" title={documentName}>
                      {documentName}
                    </p>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 text-sm font-semibold text-slate-900">Короткие реквизиты</div>
                        <div className="grid grid-cols-1 gap-3">
                          {documentCardFacts.map((fact) => (
                            <div key={fact.label} className="rounded-lg bg-slate-50 px-3 py-2">
                              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{fact.label}</div>
                              <div className="mt-1 text-sm font-medium text-slate-900 break-words">{fact.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 shadow-sm">
                        <div className="text-sm font-semibold text-indigo-950">Полная карточка в чате</div>
                        <div className="mt-2 text-sm leading-6 text-indigo-900/80">
                          Первым сообщением справа показаны полные реквизиты и, если нужно, автоматическое уточнение типа документа.
                        </div>
                      </div>
                      {documentCardFacts.length === 0 && pipelineMode === "real" && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
                          Экстрактор завершил обработку, но полезные поля не были найдены в ответе.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel: Chat */}
                <div className="w-full md:w-2/3 flex flex-col h-full bg-white">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Чат с документом</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                      pipelineMode === "demo"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        pipelineMode === "demo" ? "bg-amber-500" : "bg-emerald-500"
                      }`}></div>
                      {pipelineMode === "demo" ? "Демо-контекст" : "Контекст загружен"}
                    </span>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-tr-sm"
                              : "bg-slate-100 text-slate-900 rounded-tl-sm"
                          }`}
                        >
                          <span className="whitespace-pre-wrap break-words">{msg.text}</span>
                        </div>
                      </div>
                    ))}
                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 text-slate-900 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Quick Prompts & Input */}
                  <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {QUICK_PROMPTS[activeDocType].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(prompt)}
                          disabled={isAiTyping}
                          className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100 disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendMessage(chatInput);
                          }
                        }}
                        placeholder="Задайте вопрос по документу..."
                        disabled={isAiTyping}
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-slate-900 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendMessage(chatInput)}
                        disabled={!chatInput.trim() || isAiTyping}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
