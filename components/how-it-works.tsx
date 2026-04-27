"use client";

import { motion } from "motion/react";
import { Link2, DatabaseZap, LayoutTemplate } from "lucide-react";

const steps = [
  {
    title: "Безопасное подключение",
    description:
      "Подключаем коннекторы к вашей почте, сетевым папкам, 1С, СЭД и другим источникам. Данные остаются там, где лежат сейчас — ИИ начинает работать поверх существующего контура.",
    icon: Link2,
    number: "01",
  },
  {
    title: "Умная индексация",
    description:
      "ИИ Коллектив прочитывает документы, связывает письма с договорами, акты со счетами, приложения со спецификациями и автоматически наводит порядок без участия сотрудников.",
    icon: DatabaseZap,
    number: "02",
  },
  {
    title: "Единая точка доступа",
    description:
      "Сотрудники получают простой интерфейс: можно искать по смыслу, задавать вопросы обычным языком, открывать нужные документы и получать готовые данные без ручной навигации по архивам.",
    icon: LayoutTemplate,
    number: "03",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 bg-slate-900 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Как это работает (Этапы внедрения)
          </h2>
          <p className="text-lg text-slate-400">
            Бесшовный процесс, который не требует перестройки ваших бизнес-процессов и не заставляет переносить документы в новую систему.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent -translate-y-1/2" />

          <div className="grid md:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-indigo-500/30 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(99,102,241,0.15)] relative group">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-500/20 transition-colors" />
                  <step.icon className="w-8 h-8 text-indigo-400 relative z-10" />

                  {/* Big Number Background */}
                  <div className="absolute -top-6 -right-6 text-6xl font-display font-black text-slate-800/50 pointer-events-none select-none">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-4 font-display">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed max-w-sm">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
