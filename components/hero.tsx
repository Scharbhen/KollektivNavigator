"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, ArrowRight, Sparkles, FileUp, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { InteractiveDemo } from "./interactive-demo";

export function Hero() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  useEffect(() => {
    const handleOpenDemo = () => setIsDemoOpen(true);
    window.addEventListener('open-demo', handleOpenDemo);
    return () => window.removeEventListener('open-demo', handleOpenDemo);
  }, []);

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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-slate-300 mb-8"
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>AI-поиск для любого бизнеса</span>
            <span className="w-1 h-1 rounded-full bg-slate-600 mx-1 hidden sm:inline-block" />
            <ShieldCheck className="w-4 h-4 text-emerald-400 hidden sm:inline-block" />
            <span className="hidden sm:inline-block">В Реестре Российского ПО</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white tracking-tight leading-[1.1] mb-6"
          >
            Внедряем интеллектуальную <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
              обработку документов на ИИ (IDP)
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl md:text-2xl text-slate-300 mb-4 font-medium"
          >
            ИИ Коллектив распознаёт договоры, счета, акты и сканы, извлекает нужные данные и готовит их для ваших учётных систем.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed"
          >
            Сокращаем ручной ввод, сверку реквизитов и поиск по папкам, почте и
            архивам. Решение разворачивается внутри вашего ИТ-контура.
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

        {/* Infographic / How it works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-24 relative mx-auto max-w-5xl"
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              Как работает ИИ Коллектив
            </h3>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Интеллектуальный слой над вашими документами и системами: подключает источники, понимает содержание файлов, извлекает нужные данные и выдает готовый результат с учетом прав доступа.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Lines (Desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-indigo-500/20 via-emerald-500/20 to-indigo-500/20 -translate-y-1/2 z-0" />
            <div className="hidden md:block absolute top-1/2 left-[33%] w-4 h-4 rounded-full bg-indigo-500/50 -translate-y-1/2 -translate-x-1/2 z-0 animate-pulse" />
            <div className="hidden md:block absolute top-1/2 left-[66%] w-4 h-4 rounded-full bg-emerald-500/50 -translate-y-1/2 -translate-x-1/2 z-0 animate-pulse" />

            {/* Step 1: Sources */}
            <div className="relative z-10 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-white mb-3">1. Подключение баз</h4>
              <p className="text-sm text-slate-400 mb-6">
                Безопасно подключаемся к вашим текущим системам без переноса данных и без перестройки процессов.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-white/5">1C:Предприятие</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-white/5">Почта / Exchange</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-white/5">Сетевые папки</span>
                <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-white/5">Jira / Confluence</span>
              </div>
            </div>

            {/* Step 2: AI Engine */}
            <div className="relative z-10 bg-gradient-to-b from-indigo-900/40 to-slate-900/80 backdrop-blur-sm border border-indigo-500/30 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl transform md:-translate-y-4">
              <div className="absolute -top-3 px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                Ядро системы
              </div>
              <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center mb-6 relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                <Sparkles className="w-10 h-10 text-indigo-300 relative z-10" />
              </div>
              <h4 className="text-lg font-bold text-white mb-3">2. Нейро-индексация</h4>
              <p className="text-sm text-indigo-200/70 mb-6">
                ИИ читает документы, понимает контекст, извлекает сущности, связывает письма, договоры, счета, акты и приложения в единый слой данных.
              </p>
              <ul className="text-left text-sm text-slate-300 space-y-2 w-full">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>VLM-зрение вместо обычного OCR</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Извлечение реквизитов и сущностей из реальных документов</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Поиск по смыслу и строгий контроль прав доступа</span>
                </li>
              </ul>
            </div>

            {/* Step 3: User UI */}
            <div className="relative z-10 bg-slate-900/80 backdrop-blur-sm border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                <Search className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-3">3. Мгновенный ответ</h4>
              <p className="text-sm text-slate-400 mb-6">
                Сотрудник задает вопрос на обычном языке или открывает документ — и сразу получает не хаос файлов, а готовый ответ, карточку документа или проверку по комплекту.
              </p>
              <div className="w-full bg-slate-950 rounded-xl p-3 border border-white/5 text-left">
                <div className="text-xs text-slate-500 mb-1">Запрос:</div>
                <div className="text-sm text-white mb-3">Какие условия возврата по договору с ООО &quot;Альфа&quot;?</div>
                <div className="text-xs text-slate-500 mb-1">Ответ ИИ:</div>
                <div className="text-sm text-emerald-400">Возврат возможен в течение 14 дней (п. 4.2 Договора №18 от 12.05.2023).</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <InteractiveDemo isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </section>
  );
}
