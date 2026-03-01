"use client";

import { motion } from "motion/react";
import { Clock, ShieldCheck, BrainCircuit } from "lucide-react";

const benefits = [
  {
    title: "Высвобождение FTE",
    description:
      "Сокращаем время поиска информации в 10 раз. Ваши сотрудники занимаются реальными задачами, а не «цифровой археологией».",
    icon: Clock,
    stat: "10x",
    statLabel: "быстрее поиск",
  },
  {
    title: "Снижение рисков (Compliance)",
    description:
      "Ни один важный документ, доп-соглашение или условие не затеряется в цифровом шуме. 100% контроль всей входящей информации для аудитов и проверок.",
    icon: ShieldCheck,
    stat: "100%",
    statLabel: "контроль данных",
  },
  {
    title: "Сохранение экспертизы",
    description:
      "Знания компании не уходят вместе с уволившимся сотрудником. Вся история решений и документов остается в «мозгах» компании и доступна преемнику с первого дня.",
    icon: BrainCircuit,
    stat: "0",
    statLabel: "потерь знаний",
  },
];

export function Benefits() {
  return (
    <section
      id="benefits"
      className="py-24 bg-slate-900 border-t border-white/5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
            Обеспечиваем реальный экономический эффект
          </h2>
          <p className="text-lg text-slate-400">
            ИИ Коллектив окупается в первые месяцы за счет экономии времени и
            снижения рисков.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-slate-950 rounded-3xl p-8 border border-white/10 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <benefit.icon className="w-32 h-32 text-indigo-400" />
              </div>

              <div className="relative z-10">
                <div className="mb-8">
                  <div className="text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 mb-2">
                    {benefit.stat}
                  </div>
                  <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                    {benefit.statLabel}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-4 font-display">
                  {benefit.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
