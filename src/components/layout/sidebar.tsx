"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderKanban,
  TrendingUp,
  FileText,
  CreditCard,
  Award,
  Bot,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Building2,
  HelpCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/leads", icon: Users, label: "Leads" },
      { href: "/clients", icon: UserCheck, label: "Clients" },
      { href: "/pipeline", icon: TrendingUp, label: "Pipeline" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/projects", icon: FolderKanban, label: "Projects" },
      { href: "/invoices", icon: FileText, label: "Invoices" },
      { href: "/payments", icon: CreditCard, label: "Payments" },
      { href: "/commissions", icon: Award, label: "Commissions" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/analytics", icon: BarChart3, label: "Analytics" },
      { href: "/ai", icon: Bot, label: "AI Assistant", badge: "AI" },
      { href: "/notifications", icon: Bell, label: "Notifications" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-white text-sm leading-tight">WithUnion</div>
              <div className="text-violet-400 text-[10px] font-medium">CRM Platform</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors",
            collapsed && "ml-0"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="px-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {section.label}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                        : "text-slate-400 hover:text-white hover:bg-slate-800",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {"badge" in item && item.badge && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            item.badge === "AI"
                              ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
                              : "bg-red-500 text-white"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* AI Promo Banner */}
      {!collapsed && (
        <div className="mx-2 mb-2 p-3 rounded-lg bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">AI Assistant</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Ask AI to analyze leads, draft proposals, and predict deals.
          </p>
          <Link
            href="/ai"
            className="mt-2 flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 font-medium"
          >
            Try AI <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* User Profile */}
      <div className="border-t border-slate-800 p-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.name}</div>
              <div className="text-[11px] text-slate-500 truncate">
                {user.title ?? user.role.replace("_", " ")}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              disabled={signingOut}
              title="Sign out"
              aria-label="Sign out"
              className="p-1 rounded text-slate-500 hover:text-white transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
