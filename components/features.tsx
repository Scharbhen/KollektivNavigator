"use client";

import { motion } from "motion/react";
import { Search, MessageSquare, UserPlus } from "lucide-react";

const features = [
  {
    title: "ИИ Поиск (Discovery)",
    description:
      "ИИ Коллектив находит «тот самый файл от Вадима», даже если вы не помните название. Система индексирует Outlook, сетевые папки (SMB) и архивы, понимая суть запроса, а не просто совпадающие буквы.",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    title: "ИИ Ответы (RAG)",
    description:
      "Система не просто выдает список ссылок, а пишет готовый ответ: «Согласно переписке и договору от 12.03, мы работаем по постоплате 30 дней». ИИ дает прямую ссылку на абзац в документе-источнике.",
    icon: MessageSquare,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    title: "ИИ Онбординг",
    description:
      "Помогает новым сотрудникам мгновенно войти в курс дела без отвлечения коллег. «Где лежит регламент по закупкам?», «На чем остановились по проекту X?» — ИИ знает ответы на основе накопленной базы знаний.",
    icon: UserPlus,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-24 bg-slate-950 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Области применения ИИ Коллектива
          </h2>
          <p className="text-lg text-slate-400">
            От простого поиска до полноценного управления знаниями компании.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-full p-8 rounded-2xl border border-white/10 bg-slate-900/50 hover:bg-slate-900 transition-colors flex flex-col">
                <div
                  className={`w-14 h-14 rounded-xl ${feature.bg} ${feature.border} border flex items-center justify-center mb-6`}
                >
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4 font-display">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed flex-1">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
