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
  Copy,
  Check,
  ChevronRight,
  FileDigit,
  FileSpreadsheet,
  FileQuestion,
} from "lucide-react";

type Step = "email" | "upload" | "processing" | "result";
type DocType = "contract" | "invoice" | "act" | "free" | null;

const DOC_TYPES = [
  { id: "contract", label: "Договор", icon: FileText, desc: "Извлечение сторон, сумм, сроков" },
  { id: "invoice", label: "Счет-фактура", icon: FileDigit, desc: "ИНН, КПП, суммы с НДС" },
  { id: "act", label: "Акт", icon: FileSpreadsheet, desc: "Позиции, подписанты, суммы" },
  { id: "free", label: "Свободный формат", icon: FileQuestion, desc: "Краткое резюме (Summary)" },
] as const;

const QUICK_PROMPTS = {
  contract: ["Какие здесь штрафные санкции?", "Как расторгнуть этот договор?", "Каковы сроки оплаты?"],
  invoice: ["Совпадают ли суммы с НДС и без?", "Кто плательщик?", "Укажи реквизиты банка"],
  act: ["Совпадают ли суммы в тексте?", "Кто подписант?", "Какие услуги оказаны?"],
  free: ["Составь краткое резюме документа", "Выдели ключевые тезисы", "Кто автор документа?"],
};

const MOCK_METADATA = {
  contract: {
    "Сторона 1 (Заказчик)": "ООО «Альфа»",
    "Сторона 2 (Исполнитель)": "ИП Иванов И.И.",
    "Предмет договора": "Оказание консультационных услуг",
    "Сумма": "1 500 000 руб.",
    "Сроки": "до 31.12.2026",
    "Подсудность": "Арбитражный суд г. Москвы",
  },
  invoice: {
    "ИНН Продавца": "7701234567",
    "КПП Продавца": "770101001",
    "Сумма без НДС": "1 000 000 руб.",
    "Сумма НДС (20%)": "200 000 руб.",
    "Итого с НДС": "1 200 000 руб.",
  },
  act: {
    "Исполнитель": "ООО «ТехРешения»",
    "Заказчик": "ПАО «МегаКорп»",
    "Сумма": "500 000 руб.",
    "Статус подписания": "Подписано обеими сторонами",
  },
  free: {
    "Тип документа": "Внутренний регламент",
    "Тематика": "Информационная безопасность",
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
  const [processingLogIndex, setProcessingLogIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep("email");
      setEmail("");
      setEmailError("");
      setDocType(null);
      setFile(null);
      setProcessingLogIndex(0);
      setChatHistory([]);
      setChatInput("");
    }
  }, [isOpen]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiTyping]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Введите корректный email");
      return;
    }
    setEmailError("");
    // TODO: API call to save lead
    setStep("upload");
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!docType) return;
    setFile(selectedFile);
    setStep("processing");
    simulateProcessing();
  };

  const simulateProcessing = () => {
    let currentLog = 0;
    const interval = setInterval(() => {
      currentLog++;
      setProcessingLogIndex(currentLog);
      if (currentLog >= PROCESSING_LOGS.length - 1) {
        clearInterval(interval);
        setTimeout(() => {
          setStep("result");
          setChatHistory([
            {
              role: "ai",
              text: "Документ успешно проанализирован. Вы можете задать мне вопросы по его содержимому.",
            },
          ]);
        }, 1000);
      }
    }, 800);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    
    setChatHistory((prev) => [...prev, { role: "user", text }]);
    setChatInput("");
    setIsAiTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsAiTyping(false);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "ai",
          text: `На основе загруженного документа (${file?.name || "документ"}), могу сообщить следующее: это демонстрационный ответ. В реальной системе здесь будет ответ RAG-пайплайна с цитатами из текста.`,
        },
      ]);
    }, 1500);
  };

  if (!isOpen) return null;

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

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      Рабочий Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className={`w-full px-4 py-3 rounded-xl border ${
                        emailError ? "border-red-300 focus:ring-red-500" : "border-slate-200 focus:ring-indigo-500"
                      } focus:outline-none focus:ring-2 focus:border-transparent transition-shadow text-slate-900`}
                    />
                    {emailError && <p className="mt-1 text-sm text-red-500">{emailError}</p>}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    Продолжить <ChevronRight className="w-4 h-4" />
                  </button>
                </form>
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
              </motion.div>
            )}

            {/* STEP 4: Result */}
            {step === "result" && docType && (
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
                    <p className="text-xs text-slate-500 mt-1 truncate" title={file?.name}>
                      {file?.name || "document.pdf"}
                    </p>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="space-y-3">
                      {Object.entries(MOCK_METADATA[docType]).map(([key, value]) => (
                        <div key={key} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group">
                          <div className="text-xs font-medium text-slate-500 mb-1">{key}</div>
                          <div className="text-sm text-slate-900 font-medium flex items-start justify-between gap-2">
                            <span className="break-words">{value}</span>
                            <button
                              onClick={() => handleCopy(value, key)}
                              className="text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Копировать"
                            >
                              {copiedKey === key ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Panel: Chat */}
                <div className="w-full md:w-2/3 flex flex-col h-full bg-white">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Чат с документом</h3>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      Контекст загружен
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
                          {msg.text}
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
                      {QUICK_PROMPTS[docType].map((prompt, idx) => (
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
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(chatInput);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Задайте вопрос по документу..."
                        disabled={isAiTyping}
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-slate-900 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!chatInput.trim() || isAiTyping}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 flex items-center justify-center"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
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
