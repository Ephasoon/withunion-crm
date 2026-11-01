"use client";

import React, { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Award, BarChart3, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency, formatCompactCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

interface AnalyticsResponse {
  period: "1m" | "3m" | "6m" | "1y";
  monthly: Array<{
    month: string;
    key: string;
    revenue: number;
    leads: number;
    deals: number;
    expenses: number;
  }>;
  industry: Array<{ name: string; value: number; color: string }>;
  salesReps: Array<{
    id: string;
    name: string;
    revenue: number;
    commission: number;
    deals: number;
  }>;
  performance: Array<{ subject: string; value: number }>;
  forecast: Array<{
    month: string;
    forecast: number;
    optimistic: number;
    conservative: number;
  }>;
  forecastSummary: { conservative: number; base: number; optimistic: number };
  kpis: {
    totalRevenue: number;
    totalLeads: number;
    dealsClosed: number;
    avgDealSize: number;
    trends: {
      revenue: number | null;
      leads: number | null;
      deals: number | null;
      avgDeal: number | null;
    };
  };
}

const EMPTY_DATA: AnalyticsResponse = {
  period: "6m",
  monthly: [],
  industry: [],
  salesReps: [],
  performance: [],
  forecast: [],
  forecastSummary: { conservative: 0, base: 0, optimistic: 0 },
  kpis: {
    totalRevenue: 0,
    totalLeads: 0,
    dealsClosed: 0,
    avgDealSize: 0,
    trends: { revenue: null, leads: null, deals: null, avgDeal: null },
  },
};

export function AnalyticsContent() {
  const [period, setPeriod] = useState<AnalyticsResponse["period"]>("6m");
  const [data, setData] = useState<AnalyticsResponse>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    const res = await fetch(`/api/analytics?period=${period}`);
    if (!res.ok) throw new Error("Request failed");
    return (await res.json()) as AnalyticsResponse;
  }, [period]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAnalytics()
      .then((json) => setData(json))
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [fetchAnalytics]);

  useEffect(() => {
    let cancelled = false;
    fetchAnalytics()
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load analytics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchAnalytics]);

  const { kpis } = data;
  const maxRepRevenue = Math.max(...data.salesReps.map((rep) => rep.revenue), 1);

  const kpiCards = [
    {
      label: "Total Revenue",
      value: formatCompactCurrency(kpis.totalRevenue),
      trend: kpis.trends.revenue,
      icon: DollarSign,
      color: "bg-emerald-500",
    },
    {
      label: "Total Leads",
      value: String(kpis.totalLeads),
      trend: kpis.trends.leads,
      icon: Users,
      color: "bg-indigo-500",
    },
    {
      label: "Deals Closed",
      value: String(kpis.dealsClosed),
      trend: kpis.trends.deals,
      icon: Target,
      color: "bg-violet-500",
    },
    {
      label: "Avg Deal Size",
      value: formatCompactCurrency(kpis.avgDealSize),
      trend: kpis.trends.avgDeal,
      icon: Award,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics & Insights</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Business intelligence and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {(["1m", "3m", "6m", "1y"] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setLoading(true);
                setPeriod(p);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                period === p
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
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

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, trend, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                    {label}
                  </p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {loading && !data.monthly.length ? "—" : value}
                  </p>
                  {trend !== null && (
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1 text-xs font-medium",
                        trend >= 0 ? "text-emerald-500" : "text-red-500"
                      )}
                    >
                      {trend >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {trend > 0 ? "+" : ""}
                      {trend}% vs prev
                    </div>
                  )}
                </div>
                <div className={cn("p-2.5 rounded-xl", color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue + Profit Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
                <CardDescription>Collected revenue against commission payouts</CardDescription>
              </div>
              <Badge variant="success" className="text-[10px]">
                {formatCompactCurrency(kpis.totalRevenue)} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v ?? 0))]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Industry Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by Industry</CardTitle>
            <CardDescription>Top performing sectors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.industry}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.industry.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v ?? 0))]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {data.industry.slice(0, 4).map((ind) => (
                <div key={ind.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ind.color }}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">
                    {ind.name}
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">
                    {formatCompactCurrency(ind.value)}
                  </span>
                </div>
              ))}
              {!loading && data.industry.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-2">No revenue data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Team + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Team Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales Team Leaderboard</CardTitle>
            <CardDescription>Revenue and commission rankings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.salesReps.map((rep, i) => {
                const pct = (rep.revenue / maxRepRevenue) * 100;
                return (
                  <div key={rep.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "text-xs font-bold w-5",
                            i === 0 ? "text-amber-500" : "text-slate-400"
                          )}
                        >
                          #{i + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {rep.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {rep.deals} deals
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {formatCompactCurrency(rep.revenue)}
                        </div>
                        <div className="text-[10px] text-emerald-500 font-medium">
                          {formatCompactCurrency(rep.commission)} comm.
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {!loading && data.salesReps.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">
                  No commission data for this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Performance Radar</CardTitle>
            <CardDescription>Key business metrics scorecard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.performance}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-violet-500" />
                Revenue Forecast — Next 4 Months
              </CardTitle>
              <CardDescription>
                Projection based on recent monthly revenue trends
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-violet-500" />
                <span className="text-[11px] text-slate-500">Base Forecast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-emerald-500" style={{ borderTopStyle: "dashed" }} />
                <span className="text-[11px] text-slate-500">Optimistic</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.forecast} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="optimisticGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(Number(v) / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v ?? 0))]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Area
                  type="monotone"
                  dataKey="optimistic"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  fill="url(#optimisticGrad)"
                  name="Optimistic"
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#forecastGrad)"
                  name="Forecast"
                />
                <Area
                  type="monotone"
                  dataKey="conservative"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  fill="none"
                  name="Conservative"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {[
              { label: "Conservative", value: data.forecastSummary.conservative, color: "text-amber-500" },
              { label: "Base Forecast", value: data.forecastSummary.base, color: "text-violet-500" },
              { label: "Optimistic", value: data.forecastSummary.optimistic, color: "text-emerald-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className={cn("text-base font-bold", color)}>
                  {formatCompactCurrency(value)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
