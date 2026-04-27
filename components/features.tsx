"use client";

import { motion } from "motion/react";
import { Search, MessageSquare, UserPlus, Brain } from "lucide-react";

const features = [
  {
    title: "ИИ Поиск (Discovery)",
    description:
      "ИИ Коллектив находит «тот самый файл от Вадима», даже если никто не помнит название, папку или дату. Система ищет по смыслу, а не по совпадению букв, и вытаскивает нужные документы из Outlook, сетевых папок, архивов и вложений.",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    title: "ИИ Ответы (RAG)",
    description:
      "Система не просто показывает ссылки, а собирает готовый ответ по переписке, договору, приложению и внутренним документам. Вместо десятков файлов и ручного поиска сотрудник получает короткий, точный ответ со ссылкой на источник.",
    icon: MessageSquare,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    title: "Умнее, чем OCR (VLM-движок)",
    description:
      "Система понимает реальные документы: сложные таблицы, вложенные приложения, кривые сканы, фото, смешанные комплекты. Это не «распознаватель картинки», а рабочий слой понимания документа: что это за файл, какие в нем данные, что с ним делать дальше.",
    icon: Brain,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    title: "ИИ Онбординг",
    description:
      "Новый сотрудник больше не зависит от памяти коллег и случайных архивов. ИИ Коллектив помогает быстро понять, где лежат регламенты, как проходили прошлые решения, на чем остановились по проекту и какие документы реально важны.",
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
            От поиска и ответов по корпоративным данным до автоматического заполнения карточек документов и проверки комплектов перед учетом.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
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
