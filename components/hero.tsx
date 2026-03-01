"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search, ArrowRight, Sparkles, FileUp } from "lucide-react";
import Image from "next/image";
import { InteractiveDemo } from "./interactive-demo";

export function Hero() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-slate-950 -z-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-30 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/40 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-indigo-300 mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Российский аналог Glean для Enterprise</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.1] mb-6"
          >
            ИИ-навигатор по данным <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
              вашей компании
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-300 mb-4 font-medium"
          >
            Найдите ответ в почте, папках и 1С за 2 секунды.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            ИИ Коллектив объединяет разрозненные знания в едином окне. Он
            понимает смысл ваших документов и переписки, избавляя команду от
            бесконечного поиска и рутины. Работает внутри вашего ИТ-контура.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => setIsDemoOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 group"
            >
              <FileUp className="w-5 h-5" />
              Протестировать на своем документе
            </button>
            <button 
              onClick={() => document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white border border-white/10 rounded-full font-semibold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              Рассчитать экономику
            </button>
          </motion.div>
        </div>

        {/* Mockup / Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-20 relative mx-auto max-w-5xl"
        >
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm p-2 shadow-2xl overflow-hidden">
            <div className="rounded-xl overflow-hidden border border-white/5 bg-slate-950 relative aspect-[16/9]">
              {/* Fake UI Header */}
              <div className="absolute top-0 left-0 right-0 h-12 border-b border-white/10 bg-slate-900 flex items-center px-4 gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="mx-auto w-1/2 h-6 bg-slate-800 rounded-md flex items-center px-3 gap-2">
                  <Search className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-500 font-mono">
                    Где лежит регламент по закупкам?
                  </span>
                </div>
              </div>
              {/* Fake UI Content */}
              <div className="absolute top-12 left-0 right-0 bottom-0 p-8 flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex flex-shrink-0 items-center justify-center border border-indigo-500/30">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-none p-6 border border-white/5">
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      Согласно{" "}
                      <span className="text-indigo-400 bg-indigo-400/10 px-1 rounded">
                        Регламенту закупок v2.4
                      </span>{" "}
                      от 12.03.2024, процесс закупки начинается с подачи заявки
                      в Jira.
                      <br />
                      <br />
                      Ключевые шаги:
                      <br />
                      1. Согласование бюджета с фин. отделом (до 3 дней)
                      <br />
                      2. Сбор коммерческих предложений (минимум 3)
                      <br />
                      3. Подписание договора по типовой форме
                    </p>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-white/5">
                        <div className="w-4 h-4 rounded bg-blue-500/20 flex items-center justify-center">
                          <span className="text-[10px] text-blue-400">W</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Регламент_закупок_2024.docx
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-white/5">
                        <div className="w-4 h-4 rounded bg-yellow-500/20 flex items-center justify-center">
                          <span className="text-[10px] text-yellow-400">
                            1C
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          Справочник контрагентов
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <InteractiveDemo isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </section>
  );
}
