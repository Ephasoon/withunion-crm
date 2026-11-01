"use client";

import React, { useEffect, useState } from "react";
import {
  Search, Plus, Filter, Phone, Mail, Building2,
  Calendar, Star, ChevronDown, MoreHorizontal, TrendingUp,
  RefreshCw, Download, Upload, Tag,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import { cn, formatCurrency, formatRelativeTime, PIPELINE_STAGES, LEAD_SOURCES } from "@/lib/utils";

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
  tags: string[] | null;
  nextFollowUp: string | null;
  createdAt: string;
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

function AddLeadModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<Lead>) => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", industry: "",
    source: "", stage: "lead", value: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, value: parseFloat(form.value) || 0 }),
      });
      if (res.ok) {
        const lead = await res.json();
        onSave(lead);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add New Lead</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
              <Input
                required
                placeholder="e.g. Hana Worku"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Email</label>
              <Input
                type="email"
                placeholder="hana@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
              <Input
                placeholder="+251911..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Company</label>
              <Input
                placeholder="Company name"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Deal Value (ETB)</label>
              <Input
                type="number"
                placeholder="500000"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
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
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>Add Lead</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LeadsContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search && { search }),
        ...(stageFilter && { stage: stageFilter }),
      });
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.data ?? []);
      setPagination(data.pagination ?? { total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [search, stageFilter, page]);

  const stageInfo = (stage: string) => PIPELINE_STAGES.find((s) => s.id === stage);

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
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search leads by name, email, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All Stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={fetchLeads}
          className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stage Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStageFilter("")}
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
            onClick={() => setStageFilter(stage.id)}
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
                <th className="py-3 px-4 w-10" />
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
                              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                                {lead.name}
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
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
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
                {search || stageFilter ? "Try adjusting your filters" : "Add your first lead to get started"}
              </p>
              <Button className="mt-4" onClick={() => setShowAddModal(true)}>
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

      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onSave={() => fetchLeads()}
        />
      )}
    </div>
  );
}
