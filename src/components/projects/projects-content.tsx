"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  FolderKanban, Plus, Pencil, Trash2, Paperclip,
  Clock, CheckCircle, AlertCircle, PauseCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { DocumentsModal } from "@/components/documents/documents-panel";

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
  clientId: string | null;
  managerId: string | null;
  completedAt: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
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

function dateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function ProjectFormModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    status: project.status,
    startDate: dateInputValue(project.startDate),
    dueDate: dateInputValue(project.dueDate),
    budget: project.budget ?? "0",
    spent: project.spent ?? "0",
    progress: project.progress ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const payload = {
        name: form.name,
        description: form.description,
        status: form.status,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : "",
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : "",
        budget: form.budget === "" ? 0 : Number(form.budget),
        spent: form.spent === "" ? 0 : Number(form.spent),
        progress: Number(form.progress),
      };

      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.fields) setFieldErrors(body.fields);
        throw new Error(body?.error ?? "Unable to save project");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Project Name *</label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Description</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {fieldErrors.description && <p className="text-xs text-red-600 mt-1">{fieldErrors.description}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Status</label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {Object.entries(STATUS_CONFIG).map(([id, config]) => (
                  <option key={id} value={id}>{config.label}</option>
                ))}
              </select>
              {fieldErrors.status && <p className="text-xs text-red-600 mt-1">{fieldErrors.status}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Progress (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.progress}
                 onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
               />
               {fieldErrors.progress && <p className="text-xs text-red-600 mt-1">{fieldErrors.progress}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Start Date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              {fieldErrors.startDate && <p className="text-xs text-red-600 mt-1">{fieldErrors.startDate}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              {fieldErrors.dueDate && <p className="text-xs text-red-600 mt-1">{fieldErrors.dueDate}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Budget (ETB)</label>
              <Input
                type="number"
                 value={form.budget}
                 onChange={(e) => setForm({ ...form, budget: e.target.value })}
               />
               {fieldErrors.budget && <p className="text-xs text-red-600 mt-1">{fieldErrors.budget}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Spent (ETB)</label>
              <Input
                type="number"
                 value={form.spent}
                 onChange={(e) => setForm({ ...form, spent: e.target.value })}
               />
               {fieldErrors.spent && <p className="text-xs text-red-600 mt-1">{fieldErrors.spent}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDocuments,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onDocuments: (project: Project) => void;
}) {
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
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => onDocuments(project)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
              title="Documents"
              aria-label={`Documents for ${project.name}`}
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(project)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
              title="Edit project"
              aria-label={`Edit ${project.name}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(project)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Delete project"
              aria-label={`Delete ${project.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
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
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [documentsFor, setDocumentsFor] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data.data ?? []);
    } catch {
      setError("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchProjects, 0);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  const handleDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusyId(target.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to delete project");
      }
      setDeleting(null);
      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete project");
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

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

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {[{ id: "", label: "All Projects" }, ...Object.entries(STATUS_CONFIG).map(([id, c]) => ({ id, label: c.label }))].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setStatusFilter(id)}
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
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(item) => setEditing(item)}
                onDelete={(item) => setDeleting(item)}
                onDocuments={(item) => setDocumentsFor(item)}
              />
            ))}
      </div>

      {!loading && projects.length === 0 && (
        <div className="text-center py-20">
          <FolderKanban className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No projects found</h3>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter ? "Try a different status filter" : "Start by creating your first project"}
          </p>
          <Button className="mt-4">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        </div>
      )}

      {editing && (
        <ProjectFormModal
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={fetchProjects}
        />
      )}

      {documentsFor && (
        <DocumentsModal
          title={`Documents for ${documentsFor.name}`}
          projectId={documentsFor.id}
          onClose={() => setDocumentsFor(null)}
        />
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `"${deleting.name}" will be permanently removed. This action cannot be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === deleting?.id}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              loading={busyId === deleting?.id}
              onClick={handleDelete}
            >
              Delete project
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
