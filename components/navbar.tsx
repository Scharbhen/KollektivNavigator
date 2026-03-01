"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Menu, X, Search } from "lucide-react";
import Link from "next/link";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-slate-950/80 backdrop-blur-md border-b border-white/10 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-white tracking-tight">
              ИИ Коллектив
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Возможности
            </Link>
            <Link
              href="#benefits"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Эффект
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Внедрение
            </Link>
            <Link
              href="#solutions"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Решения
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button className="px-4 py-2 text-sm font-medium bg-white text-slate-900 rounded-full hover:bg-slate-200 transition-colors">
              Демо
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-slate-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden absolute top-full left-0 right-0 bg-slate-900 border-b border-white/10 p-4"
        >
          <div className="flex flex-col gap-4">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Возможности
            </Link>
            <Link
              href="#benefits"
              className="text-sm font-medium text-slate-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Эффект
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Внедрение
            </Link>
            <Link
              href="#solutions"
              className="text-sm font-medium text-slate-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Решения
            </Link>
            <hr className="border-white/10" />
            <button className="w-full px-4 py-2 text-sm font-medium bg-white text-slate-900 rounded-full hover:bg-slate-200 transition-colors">
              Записаться на демо
            </button>
          </div>
        </motion.div>
      )}
    </header>
  );
}
