"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 bg-slate-950 border-t border-white/5 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-indigo-900/20" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-emerald-500 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-display font-bold text-white mb-6 tracking-tight"
        >
          Перестаньте искать. <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
            Начните знать.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Покажем на ваших документах, как убрать ручной ввод, ручные сверки
          и бесконечный поиск по папкам, почте и СЭД. Проведем демонстрацию
          и рассчитаем потенциал экономии для вашего подразделения.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <button 
            onClick={() => window.dispatchEvent(new Event('open-demo'))}
            className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2 group shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            Записаться на демонстрацию
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
