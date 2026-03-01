"use client";

import { Search } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/10 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Search className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-tight">
              ИИ Коллектив
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Возможности
            </Link>
            <Link
              href="#benefits"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Эффект
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Внедрение
            </Link>
            <Link
              href="#solutions"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Решения
            </Link>
          </nav>

          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} ИИ Коллектив. Все права защищены.
          </div>
        </div>
      </div>
    </footer>
  );
}
