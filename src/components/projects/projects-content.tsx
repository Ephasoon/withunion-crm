"use client";

import React, { useEffect, useState } from "react";
import { Calendar, DollarSign, Users, FolderKanban, Plus, MoreHorizontal, Clock, CheckCircle, AlertCircle, PauseCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  budget: string | null;
  spent: string | null;
  progress: number | null;
  tags: string[] | null;
  createdAt: string;
  clientName: string | null;
  clientCompany: string | null;
  managerName: string | null;
  managerAvatar: string | null;
};

const STATUS_CONFIG = {
  planning: { label: "Planning", icon: Clock, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", badge: "info" as const },
  active: { label: "Active", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", badge: "success" as const },
  on_hold: { label: "On Hold", icon: PauseCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", badge: "warning" as const },
  completed: { label: "Completed", icon: CheckCircle, color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800/50", badge: "secondary" as const },
  cancelled: { label: "Cancelled", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", badge: "destructive" as const },
};

function daysFromNow(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function ProjectCard({ project }: { project: Project }) {
  const config = STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.planning;
  const StatusIcon = config.icon;
  const budget = parseFloat(project.budget ?? "0");
  const spent = parseFloat(project.spent ?? "0");
  const progress = project.progress ?? 0;
  const daysLeft = project.dueDate ? daysFromNow(project.dueDate) : null;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={config.badge} className="text-[10px]">
                <StatusIcon className="w-2.5 h-2.5" />
                {config.label}
              </Badge>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white leading-tight truncate">{project.name}</h3>
            {project.clientCompany && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{project.clientCompany}</p>
            )}
          </div>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {project.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress >= 80 ? "bg-emerald-500" : progress >= 50 ? "bg-violet-500" : "bg-amber-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Budget</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(budget)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Spent: {formatCurrency(spent)}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Deadline</p>
            {project.dueDate ? (
              <>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {formatDate(project.dueDate)}
                </p>
                <p className={cn(
                  "text-[10px] font-medium mt-0.5",
                  daysLeft !== null && daysLeft < 0 ? "text-red-500" : daysLeft !== null && daysLeft < 7 ? "text-amber-500" : "text-slate-400"
                )}>
                  {daysLeft !== null ? (daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`) : "—"}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400 mt-0.5">Not set</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          {project.managerName ? (
            <div className="flex items-center gap-2">
              <UserAvatar name={project.managerName} size="xs" />
              <span className="text-xs text-slate-500 truncate max-w-[100px]">{project.managerName}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">No manager</span>
          )}
          <div className="flex -space-x-1.5">
            {["Dev 1", "Dev 2"].map((name) => (
              <UserAvatar key={name} name={name} size="xs" className="ring-2 ring-white dark:ring-slate-900" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectsContent() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ ...(statusFilter && { status: statusFilter }) });
    fetch(`/api/projects?${params}`)
      .then((r) => r.json())
      .then((d) => { setProjects(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor progress, budgets, and team performance
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {[{ id: "", label: "All Projects" }, ...Object.entries(STATUS_CONFIG).map(([id, c]) => ({ id, label: c.label }))].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => {
              setLoading(true);
              setStatusFilter(id);
            }}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              statusFilter === id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading
          ? Array(4).fill(null).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3" />
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                </CardContent>
              </Card>
            ))
          : projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
      </div>

      {!loading && projects.length === 0 && (
        <div className="text-center py-20">
          <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No projects found</h3>
          <p className="text-sm text-slate-500 mt-1">Start by creating your first project</p>
          <Button className="mt-4">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        </div>
      )}
    </div>
  );
}
