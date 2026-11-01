"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Award,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Star,
  Trophy,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { cn, formatCurrency, formatCompactCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Leader {
  id: string;
  name: string;
  title: string | null;
  role: string;
  commission: number;
  baseAmount: number;
  paid: number;
  pending: number;
  rate: number;
  totalDeals: number;
}

interface Transaction {
  id: string;
  amount: string;
  rate: string;
  baseAmount: string;
  isPaid: boolean | null;
  paidAt: string | null;
  month: string | null;
  createdAt: string;
  repName: string;
  repTitle: string | null;
  dealTitle: string | null;
}

interface CommissionResponse {
  leaderboard: Leader[];
  trend: Array<{ key: string; month: string; amount: number }>;
  transactions: Transaction[];
  months: Array<{ key: string; label: string }>;
  selectedMonth: string | null;
  growthPct: number | null;
  summary: { total: number; paid: number; pending: number };
}

export function CommissionsContent() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState<CommissionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = useCallback(async () => {
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    const res = await fetch(`/api/commissions${query}`);
    if (!res.ok) throw new Error("Request failed");
    return (await res.json()) as CommissionResponse;
  }, [month]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchCommissions()
      .then((json) => setData(json))
      .catch(() => setError("Failed to load commission data"))
      .finally(() => setLoading(false));
  }, [fetchCommissions]);

  useEffect(() => {
    let cancelled = false;
    fetchCommissions()
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load commission data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchCommissions]);

  const leaderboard = data?.leaderboard ?? [];
  const transactions = data?.transactions ?? [];
  const selectedKey = month || data?.selectedMonth || "";
  const selectedLabel =
    data?.months.find((item) => item.key === selectedKey)?.label ?? "All time";
  const growthPct = data?.growthPct ?? null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Commission Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automated commission calculation and leaderboard
          </p>
        </div>
        <select
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={selectedKey}
          onChange={(e) => {
            setLoading(true);
            setMonth(e.target.value);
          }}
          disabled={loading && !data}
        >
          {(data?.months ?? []).map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
            <button
              onClick={load}
              className="text-sm font-medium text-violet-600 hover:underline"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Commission", value: data?.summary.total ?? 0, icon: Award, color: "bg-violet-500" },
          { label: "Paid Out", value: data?.summary.paid ?? 0, icon: DollarSign, color: "bg-emerald-500" },
          { label: "Pending", value: data?.summary.pending ?? 0, icon: TrendingUp, color: "bg-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {loading && !data ? "—" : formatCompactCurrency(value)}
                  </p>
                </div>
                <div className={cn("p-2.5 rounded-xl", color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Sales Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading &&
              !data &&
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border border-slate-100 dark:border-slate-800 animate-pulse bg-slate-50 dark:bg-slate-800/40"
                />
              ))}

            {!loading &&
              leaderboard.map((member, i) => {
                const paidPct =
                  member.commission > 0 ? (member.paid / member.commission) * 100 : 0;
                return (
                  <div
                    key={member.id}
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-center w-8">
                        <div
                          className={cn(
                            "text-sm font-black",
                            i === 0
                              ? "text-amber-500"
                              : i === 1
                              ? "text-slate-400"
                              : i === 2
                              ? "text-orange-600"
                              : "text-slate-400"
                          )}
                        >
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </div>
                      </div>
                      <UserAvatar name={member.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                              {member.name}
                            </h4>
                            <p className="text-xs text-slate-500">{member.title ?? member.role}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {formatCompactCurrency(member.commission)}
                            </p>
                            <p className="text-[10px] text-slate-400">{member.rate}% rate</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Paid: {formatCompactCurrency(member.paid)}
                              </span>
                              <span className="text-[10px] text-amber-600 font-medium">
                                Pending: {formatCompactCurrency(member.pending)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, paidPct)}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                            <Star className="w-3 h-3 text-amber-400" />
                            {member.totalDeals} deals
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {!loading && leaderboard.length === 0 && (
              <div className="text-center py-10 text-slate-400">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No commission records yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v ?? 0))]}
                    contentStyle={{ borderRadius: "8px", fontSize: "11px" }}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {growthPct !== null && (
              <div className="mt-3 p-3 bg-violet-50 dark:bg-violet-900/10 rounded-lg text-center">
                <div
                  className={cn(
                    "flex items-center justify-center gap-1 text-sm font-bold",
                    growthPct >= 0
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-red-500"
                  )}
                >
                  {growthPct >= 0 ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {growthPct > 0 ? "+" : ""}
                  {growthPct}% vs last month
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Commission payout growth</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Commission Transactions — {selectedLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Sales Rep", "Deal", "Base Amount", "Rate", "Commission", "Status", "Paid Date"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {loading &&
                  !data &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="py-3 px-3">
                          <div className="h-4 w-full max-w-[110px] bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading &&
                  transactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={txn.repName} size="xs" />
                          <span className="text-sm text-slate-900 dark:text-white font-medium">
                            {txn.repName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-400">
                        {txn.dealTitle ?? "—"}
                      </td>
                      <td className="py-3 px-3 text-sm font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(Number(txn.baseAmount ?? 0))}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-400">
                        {Number(txn.rate ?? 0)}%
                      </td>
                      <td className="py-3 px-3 text-sm font-bold text-violet-600 dark:text-violet-400">
                        {formatCurrency(Number(txn.amount ?? 0))}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={txn.isPaid ? "success" : "warning"} className="text-[10px]">
                          {txn.isPaid ? "Paid" : "Pending"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        {txn.paidAt ? formatDate(txn.paidAt) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!loading && !error && transactions.length === 0 && (
            <div className="text-center py-14">
              <Award className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No commissions for this period
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Commission records are generated when invoices are paid.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
