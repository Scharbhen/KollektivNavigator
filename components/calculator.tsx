"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import {
  Calculator as CalcIcon,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Image from "next/image";

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(Math.round(current)),
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

export function Calculator() {
  const [employees, setEmployees] = useState(100);
  const [salary, setSalary] = useState(150000);
  const [searchTime, setSearchTime] = useState(1.5);
  const [turnover, setTurnover] = useState(15);
  const [email, setEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState("01.03.2026");

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString("ru-RU"));
  }, []);

  const reportRef = useRef<HTMLDivElement>(null);

  // Constants
  const LICENSE_COST = 1500;
  const K_EFF = 0.7; // 70% of search time saved
  const ONBOARDING_ACCEL = 0.3; // 30% faster onboarding
  const EXPERT_SHARE = 0.1; // 10% are experts
  const EXPERT_SALARY_MULT = 1.5; // Experts earn 1.5x
  const EXPERT_TIME_SAVED = 0.05; // 5% time saved for experts

  // Calculations
  const searchTimePercent = searchTime / 8; // Assuming 8-hour workday
  const searchSavings = employees * salary * 12 * searchTimePercent * K_EFF;
  const onboardingSavings =
    employees * (turnover / 100) * salary * 2 * ONBOARDING_ACCEL;
  const expertSavings =
    employees *
    EXPERT_SHARE *
    (salary * 12) *
    EXPERT_SALARY_MULT *
    EXPERT_TIME_SAVED;

  const totalSavings = searchSavings + onboardingSavings + expertSavings;
  const totalCost = employees * LICENSE_COST * 12;
  const paybackPeriod = totalCost > 0 ? (totalCost / totalSavings) * 12 : 0;
  const hoursFreed = employees * 160 * searchTimePercent * K_EFF;
  const roi = ((totalSavings - totalCost) / totalCost) * 100;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const generateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsGenerating(true);
    try {
      // 1. Generate the image via API
      const res = await fetch("/api/generate-image", { method: "POST" });
      const data = await res.json();
      if (data.image) {
        setGeneratedImage(data.image);
      }

      // Wait a moment for the image to render in the hidden div
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Capture the report div
      if (reportRef.current) {
        const canvas = await html2canvas(reportRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("ROI_Report_II_Kollektiv.pdf");
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Ошибка при генерации отчета. Попробуйте еще раз.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section
      id="calculator"
      className="py-24 bg-slate-900 border-t border-white/5 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.05),transparent_50%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <CalcIcon className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Калькулятор возврата инвестиций в капитал знаний
          </h2>
          <p className="text-lg text-slate-400">
            Рассчитайте годовую экономию и высвобожденные часы для вашей
            команды.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Inputs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-5 bg-slate-950 rounded-3xl p-8 border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-8 font-display">
              Параметры расчета
            </h3>

            <div className="space-y-8">
              {/* Employees */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    Количество сотрудников
                  </label>
                  <span className="text-sm font-bold text-indigo-400">
                    {employees} чел.
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  step="1"
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Общее число офисных сотрудников, работающих с документами.
                </p>
              </div>

              {/* Salary */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    Средняя зарплата (gross)
                  </label>
                  <span className="text-sm font-bold text-indigo-400">
                    {formatCurrency(salary)}
                  </span>
                </div>
                <input
                  type="range"
                  min="50000"
                  max="250000"
                  step="5000"
                  value={salary}
                  onChange={(e) => setSalary(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Средний ФОТ на одного сотрудника в месяц (включая налоги).
                </p>
              </div>

              {/* Search Time */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    Время на поиск данных в день
                  </label>
                  <span className="text-sm font-bold text-indigo-400">
                    {searchTime} ч.
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.5"
                  value={searchTime}
                  onChange={(e) => setSearchTime(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Сколько часов в день сотрудники тратят на поиск файлов и
                  ответов?
                </p>
              </div>

              {/* Turnover */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    Текучесть кадров в год
                  </label>
                  <span className="text-sm font-bold text-indigo-400">
                    {turnover}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={turnover}
                  onChange={(e) => setTurnover(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Сколько сотрудников меняется за год (влияет на расчет
                  онбординга).
                </p>
              </div>
            </div>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 flex flex-col gap-6"
          >
            <div className="bg-indigo-600 rounded-3xl p-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <h3 className="text-lg font-medium text-indigo-100 mb-2">
                Суммарная экономия в год
              </h3>
              <div className="text-4xl md:text-6xl font-display font-bold text-white mb-6 tracking-tight">
                <AnimatedNumber value={totalSavings} />
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-indigo-400/30">
                <div>
                  <div className="text-indigo-200 text-sm mb-1">
                    Высвобождено времени
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {Math.round(hoursFreed).toLocaleString("ru-RU")} ч/мес
                  </div>
                </div>
                <div>
                  <div className="text-indigo-200 text-sm mb-1">
                    Окупаемость (Payback)
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {paybackPeriod.toFixed(1)} мес.
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Comparison */}
            <div className="bg-slate-950 rounded-3xl p-8 border border-white/10">
              <h3 className="text-lg font-medium text-white mb-6">
                Эффективность рабочего времени
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">До внедрения (Хаос)</span>
                    <span className="text-red-400">{searchTime} ч. потери</span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${100 - (searchTime / 8) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(searchTime / 8) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">
                      С ИИ Коллектив (Порядок)
                    </span>
                    <span className="text-emerald-400">
                      Экономия {(searchTime * K_EFF).toFixed(1)} ч.
                    </span>
                  </div>
                  <div className="h-4 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${100 - (searchTime / 8) * 100 + (searchTime / 8) * 100 * K_EFF}%`,
                      }}
                    />
                    <div
                      className="h-full bg-indigo-500"
                      style={{
                        width: `${(searchTime / 8) * 100 * (1 - K_EFF)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hook & Form */}
            <div className="bg-slate-900 rounded-3xl p-8 border border-indigo-500/20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Хотите получить детализированный отчет в формате PDF для
                    защиты перед руководством?
                  </h3>
                  <p className="text-sm text-slate-400">
                    Готовое бизнес-обоснование с инфографикой и расчетами.
                  </p>
                </div>
              </div>

              <form
                onSubmit={generateReport}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="email"
                  required
                  placeholder="Ваш рабочий E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Получить отчет
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hidden Report for PDF Generation */}
      <div className="absolute left-[-9999px] top-0">
        <div
          ref={reportRef}
          style={{ 
            width: "800px", 
            padding: "48px", 
            fontFamily: "sans-serif",
            backgroundColor: "#ffffff", 
            color: "#0f172a" 
          }}
        >
          <div
            style={{ 
              borderBottom: "2px solid #4f46e5", 
              paddingBottom: "24px", 
              marginBottom: "32px" 
            }}
          >
            <h1
              style={{ 
                fontSize: "30px", 
                fontWeight: "bold", 
                marginBottom: "8px",
                color: "#0f172a" 
              }}
            >
              Экономическое обоснование внедрения системы управления знаниями ИИ
              Коллектив
            </h1>
            <p style={{ color: "#64748b" }} suppressHydrationWarning>
              Подготовил: {email || "Пользователь"} | Дата:{" "}
              {currentDate}
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              1. Резюме для руководства (Executive Summary)
            </h2>
            <p style={{ marginBottom: "8px" }}>
              <strong>Цель проекта:</strong> Повышение операционной
              эффективности подразделения за счет внедрения ИИ-навигатора по
              корпоративным данным.
            </p>
            <p style={{ marginBottom: "8px" }}>
              <strong>Ключевая проблема:</strong> Сотрудники тратят до{" "}
              {searchTime} ч. в день на «цифровую археологию» — поиск информации
              в почте, сетевых папках и мессенджерах. Это эквивалентно потере{" "}
              {formatCurrency(searchSavings)} ежегодно.
            </p>
            <p>
              <strong>Решение:</strong> ИИ Коллектив — интеллектуальный слой над
              существующими системами, который находит ответы и документы за 2
              секунды без ручной разметки и тегов.
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              2. Расчет экономического эффекта
            </h2>
            <table
              style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", marginBottom: "16px" }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th
                    style={{ border: "1px solid #e2e8f0", padding: "12px", textAlign: "left" }}
                  >
                    Показатель
                  </th>
                  <th
                    style={{ border: "1px solid #e2e8f0", padding: "12px", textAlign: "left" }}
                  >
                    Значение
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px" }}>
                    Прямая экономия ФОТ (высвобождение FTE)
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold", color: "#059669" }}
                  >
                    {formatCurrency(totalSavings)} / год
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px" }}>
                    Ускорение выхода на мощность новых сотрудников
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold" }}
                  >
                    на {ONBOARDING_ACCEL * 100}%
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px" }}>
                    Окупаемость инвестиций (Payback Period)
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold" }}
                  >
                    {paybackPeriod.toFixed(1)} месяцев
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px" }}>
                    Прогнозируемый ROI (1 год)
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold", color: "#059669" }}
                  >
                    {Math.round(roi)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              3. Где скрываются потери сегодня?
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h3 style={{ fontWeight: "bold" }}>А. Стоимость «поиска»</h3>
                <p style={{ fontSize: "14px" }}>
                  В среднем сотрудник тратит {searchTime} ч. в день на поиск
                  актуальной версии договора, условий спецификации или истории
                  переписки.
                </p>
                <p
                  style={{ fontSize: "14px", color: "#047857", backgroundColor: "#ecfdf5", padding: "8px", marginTop: "4px", borderRadius: "4px" }}
                >
                  <strong>С ИИ Коллектив:</strong> Время поиска сокращается до{" "}
                  {(searchTime * (1 - K_EFF) * 60).toFixed(0)} минут в день.
                  Высвобожденное время перераспределяется на выполнение
                  профильных задач.
                </p>
              </div>
              <div>
                <h3 style={{ fontWeight: "bold" }}>Б. Деградация экспертизы</h3>
                <p style={{ fontSize: "14px" }}>
                  При увольнении сотрудника компания теряет до 70% накопленных
                  им знаний. Новые сотрудники вынуждены «изобретать велосипед»,
                  тратя ресурсы компании на повторное создание уже существующих
                  решений.
                </p>
                <p
                  style={{ fontSize: "14px", color: "#047857", backgroundColor: "#ecfdf5", padding: "8px", marginTop: "4px", borderRadius: "4px" }}
                >
                  <strong>С ИИ Коллектив:</strong> Система сохраняет
                  «институциональную память». Любое решение, файл или письмо
                  остаются доступны преемнику мгновенно.
                </p>
              </div>
              <div>
                <h3 style={{ fontWeight: "bold" }}>В. Операционные риски</h3>
                <p style={{ fontSize: "14px" }}>
                  Использование неактуальных версий документов или потеря
                  критически важных условий в переписке ведут к штрафам и
                  юридическим спорам.
                </p>
                <p
                  style={{ fontSize: "14px", color: "#047857", backgroundColor: "#ecfdf5", padding: "8px", marginTop: "4px", borderRadius: "4px" }}
                >
                  <strong>С ИИ Коллектив:</strong> 100% контроль входящей
                  информации. ИИ подсвечивает расхождения в данных до того, как
                  они станут финансовой проблемой.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              4. Сравнение с альтернативами
            </h2>
            <table
              style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", fontSize: "14px" }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  <th
                    style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "left" }}
                  >
                    Критерий
                  </th>
                  <th
                    style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "left" }}
                  >
                    Традиционные системы (СЭД/ECM)
                  </th>
                  <th
                    style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "left", color: "#4f46e5" }}
                  >
                    ИИ Коллектив
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "500" }}
                  >
                    Внедрение
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    Месяцы/Годы (требуется миграция данных)
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    1-2 недели (работает поверх текущих папок)
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "500" }}
                  >
                    Обучение персонала
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    Сложное (нужно учить правила именования и теги)
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    Не требуется (интерфейс «как в Google»)
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "500" }}
                  >
                    Точность поиска
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    Поиск по буквам (часто ничего не находит)
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    Поиск по смыслу (понимает контекст запроса)
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "500" }}
                  >
                    Безопасность
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    Облачные решения несут риск утечки
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    On-premise (полностью в вашем контуре)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              5. Техническая надежность и безопасность
            </h2>
            <ul style={{ paddingLeft: "20px", fontSize: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <strong>Deployment:</strong> Развертывание на серверах заказчика
                (On-premise).
              </li>
              <li>
                <strong>Privacy:</strong> Данные не передаются во внешние
                нейросети (OpenAI и др.).
              </li>
              <li>
                <strong>Integrations:</strong> Нативная поддержка 1С, Outlook,
                Exchange, SMB-папок.
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              6. Инфографика: До и После
            </h2>
            <div
              style={{ width: "100%", height: "256px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0", overflow: "hidden", position: "relative", backgroundColor: "#f1f5f9" }}
            >
              {generatedImage ? (
                <Image
                  src={generatedImage}
                  alt="До и После"
                  fill
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
              ) : (
                <span style={{ color: "#94a3b8" }}>
                  Генерация изображения...
                </span>
              )}
            </div>
            <p style={{ fontSize: "12px", marginTop: "8px", textAlign: "right", color: "#94a3b8" }}>
              Автор: Система ИИ Коллектив
            </p>
          </div>

          <div
            style={{ padding: "24px", borderRadius: "8px", border: "1px solid #e0e7ff", backgroundColor: "#eef2ff" }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#312e81" }}>
              Следующий шаг: Бесплатный Пилот (Proof of Concept)
            </h2>
            <p style={{ fontSize: "14px", marginBottom: "8px" }}>
              Для подтверждения расчетных цифр предлагается проведение пилотного
              проекта на ограниченном массиве данных (1-2 департамента):
            </p>
            <ul style={{ paddingLeft: "20px", fontSize: "14px", marginBottom: "16px" }}>
              <li>
                <strong>Срок:</strong> 14 дней.
              </li>
              <li>
                <strong>Результат:</strong> Отчет о фактическом сокращении
                времени на поиск и точности ответов ИИ на реальных документах
                компании.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
