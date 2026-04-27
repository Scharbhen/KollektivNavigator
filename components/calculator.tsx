"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import {
  Calculator as CalcIcon,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import { toPng } from "html-to-image";
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
  const [employees, setEmployees] = useState(30);
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
  const WORKDAY_HOURS = 8;
  const WORK_MONTH_HOURS = 160;
  const K_EFF = 0.7; // 70% of search time saved
  const ONBOARDING_ACCEL = 0.3; // 30% faster onboarding
  const EXPERT_SHARE = 0.1; // 10% are experts
  const EXPERT_SALARY_MULT = 1.5; // Experts earn 1.5x
  const EXPERT_TIME_SAVED = 0.05; // 5% time saved for experts

  // Calculations
  const searchTimePercent = searchTime / WORKDAY_HOURS;
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
  const targetRoi = 3; // 300%
  const maxProjectCost = totalSavings / (targetRoi + 1);
  const hoursFreed = employees * WORK_MONTH_HOURS * searchTimePercent * K_EFF;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return Math.round(value).toLocaleString("ru-RU");
  };

  const generateReport = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      alert("Пожалуйста, введите ваш рабочий E-mail");
      return;
    }

    setIsGenerating(true);
    try {
      // Wait a moment for the layout to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Capture the report div
      if (reportRef.current) {
        const imgData = await toPng(reportRef.current, {
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          style: {
            transform: "scale(1)",
            transformOrigin: "top left",
          },
        });

        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        // We need to calculate the height based on the aspect ratio.
        // Since we don't have the canvas dimensions directly, we can get the element's dimensions.
        const elWidth = reportRef.current.offsetWidth;
        const elHeight = reportRef.current.offsetHeight;
        const pdfHeight = (elHeight * pdfWidth) / elWidth;

        const pageHeight = pdf.internal.pageSize.getHeight();
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        pdf.save("ROI_Report_II_Kollektiv.pdf");

        // Save lead data
        try {
          await fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              source: "calculator",
              metadata: {
                employees,
                salary,
                searchTime,
                turnover,
                totalSavings,
                maxProjectCost,
                hoursFreed
              }
            }),
          });
        } catch (e) {
          console.error("Failed to save lead:", e);
        }
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
            Калькулятор экономического эффекта
          </h2>
          <p className="text-lg text-slate-400">
            Посчитайте на своих данных, какой эффект вы получите от нашего решения.
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
                  max="300"
                  step="1"
                  value={employees}
                  onChange={(e) => setEmployees(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Общее число офисных сотрудников, которые ищут документы,
                  заполняют карточки, сверяют реквизиты или работают с входящей
                  информацией.
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
                  Сколько часов сотрудники тратят на поиск файлов, переписки,
                  версий документов, приложений и условий.
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
                  Сколько сотрудников меняется за год и сколько времени компания
                  тратит на повторную передачу знаний.
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
                    Бюджет для целевого ROI
                  </div>
                  <div className="text-2xl font-bold text-white">
                    <AnimatedNumber value={maxProjectCost} />
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
                  <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-slate-400">До внедрения</span>
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
                  <div className="mb-2 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-slate-400">С ИИ Коллектив</span>
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
                    Мы подготовим готовое бизнес-обоснование с расчетами, цифрами
                    и инфографикой.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="Ваш рабочий E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      generateReport(e);
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={isGenerating || !email}
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
              </div>
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
              Экономический эффект от внедрения ИИ Коллектива
            </h1>
            <p style={{ color: "#64748b" }} suppressHydrationWarning>
              Дата расчета: {currentDate}
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              1. Предложение и следующий шаг
            </h2>
            <p style={{ marginBottom: "8px" }}>
              Мы предлагаем провести короткий звонок, уточнить ваш сценарий
              работы с документами и запустить бесплатный пилот на реальных
              данных вашей компании. Пилот позволит проверить качество
              распознавания, извлечения реквизитов и поиска по вашим документам,
              а также оценить фактический экономический эффект до полноценного
              внедрения.
            </p>
            <p>
              Ниже приведен предварительный расчет на основе данных, которые вы
              указали в калькуляторе. Он показывает ориентировочный порядок
              экономии за счет сокращения ручного поиска, сверки документов,
              заполнения карточек и повторного восстановления контекста
              сотрудниками.
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              2. Кратко о решении
            </h2>
            <p style={{ marginBottom: "8px" }}>
              ИИ Коллектив работает поверх существующих источников: почты,
              сетевых папок, СЭД, 1С и архивов документов. Система понимает
              содержание файлов, извлекает реквизиты, собирает карточки
              документов, помогает проверять комплектность и отвечает на вопросы
              сотрудников на обычном языке.
            </p>
            <p>
              В результате сотрудники меньше времени тратят на ручной поиск,
              сверку, перенос данных и восстановление контекста по переписке или
              старым документам.
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              3. Исходные данные для расчета
            </h2>
            <table
              style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", marginBottom: "12px" }}
            >
              <tbody>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px", fontWeight: "500" }}>
                    Количество сотрудников
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px" }}>
                    {employees}
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px", fontWeight: "500" }}>
                    Средняя зарплата gross
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px" }}>
                    {formatCurrency(salary)} / месяц
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px", fontWeight: "500" }}>
                    Время на поиск и разбор данных
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px" }}>
                    {searchTime} ч. в день на сотрудника
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px", fontWeight: "500" }}>
                    Текучесть кадров
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "10px" }}>
                    {turnover}% в год
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Допущение: рабочий день принят за {WORKDAY_HOURS} часов, рабочий
              месяц — за {WORK_MONTH_HOURS} часов.
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              4. Итоговый предварительный расчет
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
                    Суммарная экономия в год
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold", color: "#059669" }}
                  >
                    {formatCurrency(totalSavings)} / год
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px" }}>
                    Высвобождено времени
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold" }}
                  >
                    {formatNumber(hoursFreed)} ч/мес
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px" }}>
                    Целевой ROI (1 год)
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold" }}
                  >
                    300%
                  </td>
                </tr>
                <tr>
                  <td style={{ border: "1px solid #e2e8f0", padding: "12px" }}>
                    Максимальный бюджет проекта
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "12px", fontWeight: "bold", color: "#059669" }}
                  >
                    {formatCurrency(maxProjectCost)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: "14px" }}>
              Это не абстрактная эффективность, а оценка возврата времени
              сотрудников, снижения повторного сбора знаний и уменьшения ручной
              работы с документами.
            </p>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              5. Как считается экономия
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
                <h3 style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  1. Экономия на поиске и ручном разборе документов
                </h3>
                <p style={{ fontSize: "14px", marginBottom: "6px" }}>
                  <strong>Формула:</strong> сотрудники × зарплата × 12 × доля
                  рабочего дня на поиск × 70%.
                </p>
                <p style={{ fontSize: "14px", marginBottom: "6px" }}>
                  Если сотрудник тратит {searchTime} ч. в день на поиск файлов,
                  сверку документов, разбор писем и перенос данных, это примерно{" "}
                  {Math.round(searchTimePercent * 100)}% рабочего дня. В расчете
                  заложено, что ИИ Коллектив сокращает эту нагрузку на{" "}
                  {K_EFF * 100}%, потому что часть операций остается за
                  человеком: принятие решения, проверка результата и
                  согласование.
                </p>
                <p style={{ fontSize: "14px", fontWeight: "bold", color: "#059669" }}>
                  Результат: {formatCurrency(searchSavings)} / год
                </p>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
                <h3 style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  2. Экономия на онбординге новых сотрудников
                </h3>
                <p style={{ fontSize: "14px", marginBottom: "6px" }}>
                  <strong>Формула:</strong> сотрудники × текучесть × зарплата × 2
                  месяца × 30%.
                </p>
                <p style={{ fontSize: "14px", marginBottom: "6px" }}>
                  При смене сотрудников компания теряет контекст: где лежат
                  документы, почему принимались решения, какая переписка важна и
                  какие версии файлов актуальны. Мы считаем, что новый сотрудник
                  обычно тратит до двух месяцев на восстановление контекста, а
                  ИИ Коллектив сокращает этот период на {ONBOARDING_ACCEL * 100}%.
                </p>
                <p style={{ fontSize: "14px", fontWeight: "bold", color: "#059669" }}>
                  Результат: {formatCurrency(onboardingSavings)} / год
                </p>
              </div>

              <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
                <h3 style={{ fontWeight: "bold", marginBottom: "8px" }}>
                  3. Сохранение экспертизы ключевых сотрудников
                </h3>
                <p style={{ fontSize: "14px", marginBottom: "6px" }}>
                  <strong>Формула:</strong> сотрудники × 10% экспертов × зарплата
                  × 12 × 1.5 × 5%.
                </p>
                <p style={{ fontSize: "14px", marginBottom: "6px" }}>
                  Часть сотрудников обладает критичной экспертизой: знает историю
                  договоров, клиентов, внутренних решений и исключений. В модели
                  принято, что таких сотрудников около {EXPERT_SHARE * 100}%, их
                  стоимость для бизнеса выше средней, а система возвращает
                  минимум {EXPERT_TIME_SAVED * 100}% их времени за счет быстрого
                  доступа к контексту и документам.
                </p>
                <p style={{ fontSize: "14px", fontWeight: "bold", color: "#059669" }}>
                  Результат: {formatCurrency(expertSavings)} / год
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              6. Где скрываются потери сегодня?
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h3 style={{ fontWeight: "bold" }}>А. Стоимость поиска</h3>
                <p style={{ fontSize: "14px" }}>
                  Сотрудники тратят до {searchTime} ч. в день на поиск актуальной
                  версии договора, приложений, условий спецификации, истории
                  переписки и нужных документов.
                </p>
                <p
                  style={{ fontSize: "14px", color: "#047857", backgroundColor: "#ecfdf5", padding: "8px", marginTop: "4px", borderRadius: "4px" }}
                >
                  <strong>С ИИ Коллективом:</strong> Это время резко сокращается,
                  а сотрудники возвращаются к основной работе.
                </p>
              </div>
              <div>
                <h3 style={{ fontWeight: "bold" }}>Б. Деградация экспертизы</h3>
                <p style={{ fontSize: "14px" }}>
                  При увольнении или переходе сотрудника компания теряет накопленный
                  контекст. Новые сотрудники повторно собирают знания из писем,
                  папок, переписки и устных объяснений.
                </p>
                <p
                  style={{ fontSize: "14px", color: "#047857", backgroundColor: "#ecfdf5", padding: "8px", marginTop: "4px", borderRadius: "4px" }}
                >
                  <strong>С ИИ Коллективом:</strong> Система сохраняет
                  институциональную память. Любое решение, файл или письмо
                  остаются доступны преемнику мгновенно.
                </p>
              </div>
              <div>
                <h3 style={{ fontWeight: "bold" }}>В. Операционные риски</h3>
                <p style={{ fontSize: "14px" }}>
                  Использование неактуальных версий документов, потеря критичных
                  условий в переписке и ручные ошибки в реквизитах ведут к
                  штрафам, задержкам и спорам.
                </p>
                <p
                  style={{ fontSize: "14px", color: "#047857", backgroundColor: "#ecfdf5", padding: "8px", marginTop: "4px", borderRadius: "4px" }}
                >
                  <strong>С ИИ Коллективом:</strong> ИИ подсвечивает расхождения и
                  помогает выявлять проблемы до того, как они становятся
                  финансовой ошибкой.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              7. Сравнение с альтернативами
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
                    Месяцы внедрения, миграция данных, жесткие правила именования
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    Работает поверх текущих источников и понимает смысл документов
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "500" }}
                  >
                    Обучение персонала
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    Сложная навигация и ручная дисциплина пользователей
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    Обычный язык, поиск по смыслу и готовые данные
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "500" }}
                  >
                    Точность поиска
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    Поиск по буквам, часто без понимания контекста
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    Поиск по смыслу, извлечение данных и ответы с источниками
                  </td>
                </tr>
                <tr>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "500" }}
                  >
                    Безопасность
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>
                    Зависит от выбранной системы и схемы хранения
                  </td>
                  <td
                    style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#4338ca" }}
                  >
                    On-premise или защищенное облако под требования заказчика
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              8. Техническая надежность и безопасность
            </h2>
            <ul style={{ paddingLeft: "20px", fontSize: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <strong>Deployment:</strong> Развертывание на серверах заказчика
                (On-premise).
              </li>
              <li>
                <strong>Privacy:</strong> Данные не передаются во внешние публичные
                нейросети.
              </li>
              <li>
                <strong>Integrations:</strong> Поддержка 1С, Outlook, Exchange,
                SMB-папок и других корпоративных источников.
              </li>
            </ul>
          </div>

          <div style={{ marginBottom: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#4f46e5" }}>
              9. До и После
            </h2>
            <div
              style={{ width: "100%", minHeight: "256px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e2e8f0", overflow: "hidden", position: "relative", backgroundColor: "#f1f5f9" }}
            >
              <div style={{ width: "100%", textAlign: "center", padding: "24px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "16px", width: "100%" }}>
                  <div style={{ flex: "1 1 240px", minWidth: "220px", backgroundColor: "#fee2e2", padding: "16px", borderRadius: "8px", border: "1px solid #fca5a5" }}>
                    <h4 style={{ color: "#991b1b", fontWeight: "bold", marginBottom: "8px" }}>До внедрения</h4>
                    <p style={{ color: "#7f1d1d", fontSize: "14px" }}>Долгий поиск, разрозненные источники, потеря контекста, ручное заполнение карточек, ручные сверки и зависимость от памяти отдельных сотрудников.</p>
                  </div>
                  <div style={{ flex: "1 1 240px", minWidth: "220px", backgroundColor: "#d1fae5", padding: "16px", borderRadius: "8px", border: "1px solid #6ee7b7" }}>
                    <h4 style={{ color: "#065f46", fontWeight: "bold", marginBottom: "8px" }}>После внедрения</h4>
                    <p style={{ color: "#064e3b", fontSize: "14px" }}>Единая точка доступа к данным, быстрые ответы, сохранение знаний, автоматическое извлечение реквизитов и меньше ручной работы с документами.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <div
              style={{ padding: "24px", borderRadius: "8px", border: "1px solid #e0e7ff", backgroundColor: "#eef2ff", marginBottom: "32px" }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#312e81" }}>
                Следующий шаг: Бесплатный Пилот (Proof of Concept)
              </h2>
              <p style={{ fontSize: "14px", marginBottom: "8px" }}>
                Для подтверждения расчетов предлагаем пилот на ограниченном массиве
                данных:
              </p>
              <ul style={{ paddingLeft: "20px", fontSize: "14px", marginBottom: "16px" }}>
                <li>
                  <strong>Срок:</strong> 14 дней.
                </li>
                <li>
                  <strong>Результат:</strong> отчет по фактическому сокращению времени
                  на поиск, качеству извлечения данных и применимости на реальных
                  документах компании.
                </li>
              </ul>
            </div>

            <div
              style={{ padding: "24px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", textAlign: "center" }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px", color: "#0f172a" }}>
                Готовы обсудить ваш кейс?
              </h2>
              <p style={{ fontSize: "14px", marginBottom: "16px", color: "#475569" }}>
                Свяжитесь с нами для точного расчета стоимости внедрения и оценки эффекта для вашей компании.
              </p>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#4f46e5" }}>
                <p style={{ marginBottom: "4px" }}>Сайт: Navigator.sapsan17.ru</p>
                <p>Email: director@sapsan17.ru</p>
              </div>
            </div>
        </div>
      </div>
    </section>
  );
}
