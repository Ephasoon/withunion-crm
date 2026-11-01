"use client";

import React, { useState, useEffect } from "react";
import { Bell, Search, Moon, Sun, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") === "dark";
    if (saved) document.documentElement.classList.add("dark");

    const frame = requestAnimationFrame(() => setDark(saved));
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-6 gap-4">
        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
          )}
        </div>

        {/* Search bar */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 text-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search anything...</span>
          <div className="flex items-center gap-0.5 ml-2">
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 rounded font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 rounded font-mono">K</kbd>
          </div>
        </button>

        {/* AI Quick Access */}
        <Link
          href="/ai"
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-medium hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Ask AI
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                placeholder="Search leads, clients, projects, invoices..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <kbd className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded text-slate-500 font-mono">ESC</kbd>
            </div>
            <div className="p-4">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Quick Links</div>
              <div className="space-y-1">
                {[
                  { label: "View all leads", href: "/leads", icon: "👥" },
                  { label: "Create new client", href: "/clients", icon: "🏢" },
                  { label: "Pipeline view", href: "/pipeline", icon: "📊" },
                  { label: "AI Assistant", href: "/ai", icon: "🤖" },
                  { label: "Analytics", href: "/analytics", icon: "📈" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
