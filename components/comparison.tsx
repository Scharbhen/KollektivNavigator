"use client";

import { motion } from "motion/react";
import { XCircle, CheckCircle2 } from "lucide-react";

const comparisonData = [
  {
    traditional: "Сотрудники тратят часы на заполнение карточек и метаданных в СЭД",
    ai: "Полный уход от ручной работы — ИИ сам извлекает данные в нужной структуре",
  },
  {
    traditional: "Информация теряется в разрозненных «файлопомойках» и архивах",
    ai: "Единая точка доступа ко всем знаниям компании без переноса файлов",
  },
  {
    traditional: "Поиск работает только по точным совпадениям и названиям",
    ai: "Система понимает смысл запроса и контекст документа",
  },
  {
    traditional: "Анализ и сбор данных для отчетов делается вручную",
    ai: "Мгновенный синтез ответов и сборка данных из десятков источников",
  },
];

export function Comparison() {
  return (
    <section className="py-24 bg-slate-950 border-t border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Конец эпохи ручного ввода данных
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Подключите любую «файлопомойку» или СЭД и получайте структурированные данные без необходимости заполнять карточки документов.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Traditional Side */}
            <div className="p-8 md:p-12 bg-slate-900 border-b md:border-b-0 md:border-r border-white/5">
              <h3 className="text-xl font-bold text-slate-300 mb-8 font-display flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <XCircle className="w-5 h-5" />
                </span>
                Традиционные СЭД / Папки
              </h3>
              <ul className="space-y-6">
                {comparisonData.map((item, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <XCircle className="w-5 h-5 text-red-400/50 mt-1 flex-shrink-0" />
                    <span className="text-slate-400 leading-relaxed">
                      {item.traditional}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Side */}
            <div className="p-8 md:p-12 bg-indigo-950/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 pointer-events-none" />
              <h3 className="text-xl font-bold text-white mb-8 font-display flex items-center gap-3 relative z-10">
                <span className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                ИИ Коллектив (AI-поиск)
              </h3>
              <ul className="space-y-6 relative z-10">
                {comparisonData.map((item, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                    <span className="text-slate-200 leading-relaxed font-medium">
                      {item.ai}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
