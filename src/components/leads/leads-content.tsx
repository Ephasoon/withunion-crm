"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search, Plus, Mail, Building2, Calendar, TrendingUp,
  RefreshCw, Download, Upload, Pencil, Trash2, UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { cn, formatCurrency, PIPELINE_STAGES, LEAD_SOURCES } from "@/lib/utils";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  industry: string | null;
  source: string | null;
  status: string;
  stage: string;
  score: number | null;
  value: string | null;
  notes: string | null;
  tags: string[] | null;
  nextFollowUp: string | null;
  assignedToId: string | null;
  convertedClientId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedToName: string | null;
  assignedToAvatar: string | null;
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-6 text-right">{score}</span>
    </div>
  );
}

function dateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function LeadFormModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    company: lead?.company ?? "",
    industry: lead?.industry ?? "",
    source: lead?.source ?? "",
    stage: lead?.stage ?? "lead",
    value: lead?.value ?? "",
    notes: lead?.notes ?? "",
    nextFollowUp: dateInputValue(lead?.nextFollowUp ?? null),
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
        email: form.email,
        phone: form.phone,
        company: form.company,
        industry: form.industry,
        source: form.source,
        stage: form.stage,
        value: form.value === "" ? 0 : Number(form.value),
        notes: form.notes,
        nextFollowUp: form.nextFollowUp
          ? new Date(form.nextFollowUp).toISOString()
          : "",
      };

      const res = await fetch(lead ? `/api/leads/${lead.id}` : "/api/leads", {
        method: lead ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.fields) setFieldErrors(body.fields);
        throw new Error(body?.error ?? "Unable to save lead");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {lead ? "Edit Lead" : "Add New Lead"}
          </h2>
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
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
              <Input
                required
                placeholder="e.g. Hana Worku"
                 value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })}
               />
               {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Email</label>
              <Input
                type="email"
                placeholder="hana@company.com"
                 value={form.email}
                 onChange={(e) => setForm({ ...form, email: e.target.value })}
               />
               {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
              <Input
                placeholder="+251911..."
                 value={form.phone}
                 onChange={(e) => setForm({ ...form, phone: e.target.value })}
               />
               {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Company</label>
              <Input
                placeholder="Company name"
                 value={form.company}
                 onChange={(e) => setForm({ ...form, company: e.target.value })}
               />
               {fieldErrors.company && <p className="text-xs text-red-600 mt-1">{fieldErrors.company}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Industry</label>
              <Input
                placeholder="Technology"
                 value={form.industry}
                 onChange={(e) => setForm({ ...form, industry: e.target.value })}
               />
               {fieldErrors.industry && <p className="text-xs text-red-600 mt-1">{fieldErrors.industry}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Deal Value (ETB)</label>
              <Input
                type="number"
                placeholder="500000"
                 value={form.value}
                 onChange={(e) => setForm({ ...form, value: e.target.value })}
               />
               {fieldErrors.value && <p className="text-xs text-red-600 mt-1">{fieldErrors.value}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Stage</label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
              >
                 {PIPELINE_STAGES.map((s) => (
                   <option key={s.id} value={s.id}>{s.label}</option>
                 ))}
               </select>
               {fieldErrors.stage && <p className="text-xs text-red-600 mt-1">{fieldErrors.stage}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Source</label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                <option value="">Select source</option>
                 {LEAD_SOURCES.map((s) => (
                   <option key={s} value={s}>{s}</option>
                 ))}
               </select>
               {fieldErrors.source && <p className="text-xs text-red-600 mt-1">{fieldErrors.source}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Next Follow-up</label>
              <Input
                type="date"
                value={form.nextFollowUp}
                 onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })}
               />
               {fieldErrors.nextFollowUp && <p className="text-xs text-red-600 mt-1">{fieldErrors.nextFollowUp}</p>}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                 value={form.notes}
                 onChange={(e) => setForm({ ...form, notes: e.target.value })}
               />
               {fieldErrors.notes && <p className="text-xs text-red-600 mt-1">{fieldErrors.notes}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {lead ? "Save Changes" : "Add Lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LeadsContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (stageFilter) params.set("stage", stageFilter);
      if (sourceFilter) params.set("source", sourceFilter);

      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const data = await res.json();
      setLeads(data.data ?? []);
      setPagination(data.pagination ?? { total: 0, pages: 1 });
    } catch {
      setError("Failed to load leads. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter, sourceFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const stageInfo = (stage: string) => PIPELINE_STAGES.find((s) => s.id === stage);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeStage = (value: string) => {
    setStageFilter(value);
    setPage(1);
  };

  const changeSource = (value: string) => {
    setSourceFilter(value);
    setPage(1);
  };

  const handleConvert = async (lead: Lead) => {
    setBusyId(lead.id);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to convert lead");
      }
      await fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to convert lead");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusyId(target.id);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to delete lead");
      }
      setDeleting(null);
      await fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete lead");
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
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lead Management</h2>
            <Badge variant="default" className="font-mono">{pagination.total}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track, score, and convert leads through your sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Add Lead
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search leads by name, email, company..."
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={stageFilter}
          onChange={(e) => changeStage(e.target.value)}
        >
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={sourceFilter}
          onChange={(e) => changeSource(e.target.value)}
        >
          <option value="">All Sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={fetchLeads}
          className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Refresh leads"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stage Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => changeStage("")}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-colors",
            stageFilter === "" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          )}
        >
          All
        </button>
        {PIPELINE_STAGES.map((stage) => (
          <button
            key={stage.id}
            onClick={() => changeStage(stage.id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              stageFilter === stage.id ? "text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
            style={stageFilter === stage.id ? { backgroundColor: stage.color } : {}}
          >
            {stage.label}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Stage</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Score</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Value</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Follow-up</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assigned</th>
                <th className="py-3 px-4 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading
                ? Array(5).fill(null).map((_, i) => (
                    <tr key={i}>
                      {Array(7).fill(null).map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : leads.map((lead) => {
                    const stage = stageInfo(lead.stage);
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={lead.name} size="sm" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                                  {lead.name}
                                </span>
                                {lead.convertedClientId && (
                                  <Badge variant="success" className="text-[9px] px-1.5">Converted</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {lead.email && (
                                  <a href={`mailto:${lead.email}`} className="text-xs text-slate-400 hover:text-violet-500 flex items-center gap-1 truncate max-w-[140px]">
                                    <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                                    <span className="truncate">{lead.email}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[130px]">{lead.company ?? "—"}</span>
                          </div>
                          {lead.source && (
                            <Badge variant="secondary" className="text-[10px] mt-0.5">{lead.source}</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          <Badge
                            variant={lead.stage as "lead" | "qualified" | "meeting" | "proposal" | "negotiation" | "won" | "project" | "support"}
                            className="capitalize"
                          >
                            {stage?.label ?? lead.stage}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <div className="w-24">
                            <ScoreBar score={lead.score ?? 0} />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right hidden md:table-cell">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(parseFloat(lead.value ?? "0"))}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden xl:table-cell">
                          {lead.nextFollowUp ? (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(lead.nextFollowUp).toLocaleDateString("en-ET", { month: "short", day: "numeric" })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          {lead.assignedToName ? (
                            <div className="flex items-center gap-2">
                              <UserAvatar name={lead.assignedToName} size="xs" />
                              <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{lead.assignedToName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {!lead.convertedClientId && (
                              <button
                                onClick={() => handleConvert(lead)}
                                disabled={busyId === lead.id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 transition-all"
                                title="Convert lead to client"
                                aria-label={`Convert ${lead.name} to client`}
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => { setEditing(lead); setShowForm(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                              title="Edit lead"
                              aria-label={`Edit ${lead.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(lead)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              title="Delete lead"
                              aria-label={`Delete ${lead.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && leads.length === 0 && (
            <div className="text-center py-16">
              <TrendingUp className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No leads found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {search || stageFilter || sourceFilter ? "Try adjusting your filters" : "Add your first lead to get started"}
              </p>
              <Button className="mt-4" onClick={() => { setEditing(null); setShowForm(true); }}>
                <Plus className="w-4 h-4" /> Add First Lead
              </Button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-500">
              Showing {leads.length} of {pagination.total} leads
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 px-2">
                {page} / {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {showForm && (
        <LeadFormModal
          lead={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={fetchLeads}
        />
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
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
              Delete lead
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
