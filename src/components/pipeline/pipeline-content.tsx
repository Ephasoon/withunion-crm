"use client";

import React, { useEffect, useState } from "react";
import { Building2, DollarSign, Plus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { cn, formatCurrency, PIPELINE_STAGES } from "@/lib/utils";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  stage: string;
  score: number | null;
  value: string | null;
  assignedToName: string | null;
  nextFollowUp: string | null;
};

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-200 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar name={lead.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{lead.name}</p>
            {lead.company && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                <Building2 className="w-2.5 h-2.5 flex-shrink-0" />
                {lead.company}
              </p>
            )}
          </div>
        </div>
        {lead.score !== null && lead.score >= 70 && (
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
        )}
      </div>

      {lead.value && parseFloat(lead.value) > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-emerald-600 dark:text-emerald-400">
          <DollarSign className="w-3.5 h-3.5" />
          <span className="text-sm font-bold">{formatCurrency(parseFloat(lead.value))}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {lead.score !== null && (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1 w-14 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  lead.score >= 75 ? "bg-emerald-500" : lead.score >= 50 ? "bg-amber-500" : "bg-red-400"
                )}
                style={{ width: `${lead.score}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-medium">{lead.score}</span>
          </div>
        )}
        {lead.assignedToName && (
          <UserAvatar name={lead.assignedToName} size="xs" className="ml-auto" />
        )}
      </div>

      {lead.nextFollowUp && (
        <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
          Follow-up: {new Date(lead.nextFollowUp).toLocaleDateString("en-ET", { month: "short", day: "numeric" })}
        </div>
      )}
    </div>
  );
}

export function PipelineContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leads?limit=100")
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const leadsByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage.id] = leads.filter((l) => l.stage === stage.id);
      return acc;
    },
    {} as Record<string, Lead[]>
  );

  const stageValue = (stageId: string) =>
    leadsByStage[stageId]?.reduce((sum, l) => sum + parseFloat(l.value ?? "0"), 0) ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Summary Bar */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-6 overflow-x-auto pb-1">
          {PIPELINE_STAGES.slice(0, 6).map((stage) => {
            const count = leadsByStage[stage.id]?.length ?? 0;
            const value = stageValue(stage.id);
            return (
              <div key={stage.id} className="flex-shrink-0 text-center">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{count}</div>
                <div className="text-xs text-slate-500">{stage.label}</div>
                {value > 0 && (
                  <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(value)}
                  </div>
                )}
              </div>
            );
          })}
          <div className="ml-auto flex-shrink-0">
            <Button size="sm">
              <Plus className="w-4 h-4" /> Add Deal
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full" style={{ minWidth: `${PIPELINE_STAGES.length * 280}px` }}>
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leadsByStage[stage.id] ?? [];
            return (
              <div key={stage.id} className="flex flex-col w-64 flex-shrink-0">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {stage.label}
                    </span>
                    <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                      {loading ? "—" : stageLeads.length}
                    </span>
                  </div>
                  <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Stage Value */}
                {!loading && stageLeads.length > 0 && (
                  <div className="mb-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(stageValue(stage.id))} total
                  </div>
                )}

                {/* Drop Zone / Cards */}
                <div
                  className="flex-1 rounded-xl p-2 space-y-2.5 min-h-[400px]"
                  style={{ backgroundColor: `${stage.color}08` }}
                >
                  {loading
                    ? Array(2).fill(null).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                            <div className="flex-1">
                              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                              <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2 mt-1" />
                            </div>
                          </div>
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
                        </div>
                      ))
                    : stageLeads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}

                  {!loading && stageLeads.length === 0 && (
                    <div
                      className="flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed text-slate-300 dark:text-slate-600 cursor-pointer hover:border-slate-400 transition-colors"
                      style={{ borderColor: `${stage.color}40` }}
                    >
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-xs">Add lead</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
