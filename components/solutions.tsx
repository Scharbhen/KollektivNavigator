"use client";

import { motion } from "motion/react";
import { Server, Puzzle, Cloud } from "lucide-react";

const solutions = [
  {
    title: "Ваш сервер (On-premise)",
    description:
      "Мы разворачиваем решение внутри вашего закрытого контура. Идеально для Enterprise, где безопасность данных в приоритете.",
    icon: Server,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
  },
  {
    title: "Плотная интеграция",
    description:
      "Мы настраиваем кастомные коннекторы под ваши уникальные системы (ERP, CRM, самописные базы данных).",
    icon: Puzzle,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    title: "Облачное решение",
    description:
      "Быстрый старт на наших защищенных мощностях для распределенных команд.",
    icon: Cloud,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
];

export function Solutions() {
  return (
    <section
      id="solutions"
      className="py-24 bg-slate-950 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Наши решения (Варианты поставки)
          </h2>
          <p className="text-lg text-slate-400">
            Гибкие варианты развертывания под ваши требования к безопасности и
            инфраструктуре.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-full p-8 rounded-2xl border border-white/10 bg-slate-900/50 hover:bg-slate-900 transition-colors flex flex-col items-start">
                <div
                  className={`w-14 h-14 rounded-xl ${solution.bg} ${solution.border} border flex items-center justify-center mb-6`}
                >
                  <solution.icon className={`w-7 h-7 ${solution.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 font-display">
                  {solution.title}
                </h3>
                <p className="text-slate-400 leading-relaxed flex-1">
                  {solution.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
