"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Безопасен ли ИИ Коллектив?",
    answer:
      "Да. Мы можем развернуть систему локально внутри вашего периметра. Документы и корпоративные данные не уходят наружу и не используются для обучения публичных моделей.",
  },
  {
    question: "А если у нас в данных полный бардак?",
    answer:
      "Это нормальный стартовый сценарий. ИИ Коллектив как раз рассчитан на работу с разрозненными папками, архивами, почтой, вложениями и неполными комплектами документов. Чтобы начать, не нужен идеальный порядок — система помогает его наводить.",
  },
  {
    question: "Нужно ли обучать сотрудников?",
    answer:
      "Нет. Интерфейс строится вокруг обычного языка и привычной логики работы с документами. Пользователю не нужно учить новые правила именования, вручную размечать архив или осваивать сложную навигацию.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-slate-900 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Ответы на ваши вопросы
          </h2>
          <p className="text-lg text-slate-400">
            Снимаем главные сомнения: безопасность, качество на сложных документах и готовность к реальному бардаку в данных.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="border border-white/10 rounded-2xl bg-slate-950 overflow-hidden"
            >
              <button
                className="w-full px-6 py-6 flex items-center justify-between text-left focus:outline-none"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="text-lg font-bold text-white font-display pr-8">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                    openIndex === index ? "rotate-180 text-indigo-400" : ""
                  }`}
                />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-6 pb-6 text-slate-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
