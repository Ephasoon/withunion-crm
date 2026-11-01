"use client";

import React, { useEffect, useState } from "react";
import {
  Users, UserCheck, FolderKanban, DollarSign,
  TrendingUp, Award, ArrowUpRight, ArrowDownRight,
  Clock, Bell, Activity, Sparkles, ChevronRight,
  Target, Zap, BarChart2, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  cn,
  formatCurrency,
  formatCompactCurrency,
  formatRelativeTime,
  PIPELINE_STAGES,
} from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import Link from "next/link";

interface Trend {
  direction: "up" | "down" | "neutral";
  label: string;
}

interface DashboardData {
  trends: {
    revenue: Trend | null;
    leads: Trend | null;
    clients: Trend | null;
    projects: Trend | null;
    conversion: Trend | null;
    commissions: Trend | null;
  };
  insight: {
    id: string | null;
    type: string;
    title: string;
    content: string;
    confidence: string | null;
    createdAt: string | null;
  } | null;
  kpis: {
    totalClients: number;
    totalLeads: number;
    activeProjects: number;
    totalRevenue: number;
    pendingCommissions: number;
    conversionRate: number;
  };
  recentPayments: Array<{
    id: string;
    amount: string;
    currency: string;
    method: string;
    paidAt: string | null;
    clientName: string | null;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    createdAt: string;
    userName: string | null;
    userAvatar: string | null;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string | null;
    createdAt: string;
    isRead: boolean;
  }>;
  pipeline: Array<{
    stage: string;
    count: number;
    totalValue: string | null;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    company: string | null;
    totalRevenue: string | null;
    industry: string | null;
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    title: string | null;
    avatar: string | null;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
    count: number;
  }>;
  upcomingFollowUps: Array<{
    id: string;
    name: string;
    company: string | null;
    stage: string;
    nextFollowUp: string | null;
    assignedToName: string | null;
  }>;
}

const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞",
  email: "📧",
  meeting: "🤝",
  note: "📝",
  task: "✅",
  sms: "💬",
  whatsapp: "💬",
};

const NOTIFICATION_COLORS: Record<string, string> = {
  lead: "text-indigo-500",
  deal: "text-violet-500",
  invoice: "text-red-500",
  payment: "text-emerald-500",
  task: "text-amber-500",
  ai: "text-purple-500",
  system: "text-slate-500",
};

function KPICard({
  title, value, subtitle, icon: Icon, trend, color, loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: Trend | null;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {title}
            </p>
            {loading ? (
              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-xs font-medium",
                trend.direction === "up" ? "text-emerald-500" : trend.direction === "down" ? "text-red-500" : "text-slate-400"
              )}>
                {trend.direction === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend.direction === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
                {trend.label}
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", color)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
          color.replace("bg-", "bg-")
        )} />
      </CardContent>
    </Card>
  );
}

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#f97316", "#10b981", "#06b6d4", "#64748b"];

export function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError("Failed to load dashboard data");
        setLoading(false);
      });
  }, []);

  const chartData =
    data?.monthlyRevenue?.map((m) => ({
      month: m.month,
      revenue: Number(m.revenue ?? 0),
    })) ?? [];

  const revenueTrend = data?.trends?.revenue ?? null;

  const pipelineChartData = (data?.pipeline ?? PIPELINE_STAGES.map((s) => ({
    stage: s.id, count: 0, totalValue: "0",
  }))).map((p) => {
    const stageInfo = PIPELINE_STAGES.find((s) => s.id === p.stage);
    return {
      name: stageInfo?.label ?? p.stage,
      value: Number(p.count),
      amount: parseFloat(String(p.totalValue ?? "0")),
    };
  }).filter((p) => p.value > 0);

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* AI Insight Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-5 text-white shadow-xl shadow-violet-500/20">
        <div className="absolute inset-0 bg-[url('/images/hero-pattern.png')] opacity-10 bg-cover" />
        <div className="relative flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">AI INSIGHT</span>
              {data?.insight?.title && (
                <span className="text-xs text-white/80 truncate">{data.insight.title}</span>
              )}
            </div>
            <p className="text-sm font-medium">
              {data?.insight?.content ??
                (loading ? "Analyzing your pipeline…" : "No insight available yet.")}
            </p>
          </div>
          <Link href="/ai">
            <Button variant="outline" size="sm" className="flex-shrink-0 border-white/30 text-white hover:bg-white/10 bg-transparent">
              Ask AI <ChevronRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Revenue"
          value={data ? formatCompactCurrency(data.kpis.totalRevenue) : "—"}
          subtitle="All time collected"
          icon={DollarSign}
          trend={data?.trends?.revenue ?? null}
          color="bg-emerald-500"
          loading={loading}
        />
        <KPICard
          title="Active Leads"
          value={data ? String(data.kpis.totalLeads) : "—"}
          subtitle="In pipeline"
          icon={Users}
          trend={data?.trends?.leads ?? null}
          color="bg-indigo-500"
          loading={loading}
        />
        <KPICard
          title="Clients"
          value={data ? String(data.kpis.totalClients) : "—"}
          subtitle="Active accounts"
          icon={UserCheck}
          trend={data?.trends?.clients ?? null}
          color="bg-violet-500"
          loading={loading}
        />
        <KPICard
          title="Projects"
          value={data ? String(data.kpis.activeProjects) : "—"}
          subtitle="In progress"
          icon={FolderKanban}
          trend={data?.trends?.projects ?? null}
          color="bg-blue-500"
          loading={loading}
        />
        <KPICard
          title="Conversion"
          value={data ? `${data.kpis.conversionRate}%` : "—"}
          subtitle="Won deals / total deals"
          icon={Target}
          trend={data?.trends?.conversion ?? null}
          color="bg-pink-500"
          loading={loading}
        />
        <KPICard
          title="Commission"
          value={data ? formatCompactCurrency(data.kpis.pendingCommissions) : "—"}
          subtitle="Pending payout"
          icon={Award}
          trend={data?.trends?.commissions ?? null}
          color="bg-amber-500"
          loading={loading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <CardDescription>Monthly collected payments — Last 6 months</CardDescription>
              </div>
              {revenueTrend && (
                <Badge variant={revenueTrend.direction === "down" ? "destructive" : "success"}>
                  {revenueTrend.label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(v) => [formatCurrency(Number(v)), "Revenue"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Stages</CardTitle>
            <CardDescription>Deal distribution across stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 flex items-center justify-center">
              {pipelineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pipelineChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [v, name]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No pipeline data yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest team actions and updates</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/leads">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(loading ? Array(4).fill(null) : (data?.recentActivities ?? [])).map((activity, i) => (
              <div
                key={activity?.id ?? i}
                className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
              >
                {loading ? (
                  <>
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base">
                      {ACTIVITY_ICONS[activity.type] ?? "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {activity.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{activity.userName ?? "Unknown"}</span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-xs text-slate-400">{formatRelativeTime(activity.createdAt)}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0 capitalize">
                      {activity.type}
                    </Badge>
                  </>
                )}
              </div>
            ))}
            {!loading && (data?.recentActivities ?? []).length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activities</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Upcoming Follow-Ups */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Follow-Ups
                </CardTitle>
                <Badge variant="warning" className="text-[10px]">
                  {data?.upcomingFollowUps.length ?? 0} pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(loading ? Array(3).fill(null) : (data?.upcomingFollowUps ?? [])).map((item, i) => (
                <div key={item?.id ?? i} className="flex items-start gap-2.5">
                  {loading ? (
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 truncate">{item.company ?? "Individual"}</p>
                        {item.nextFollowUp && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            {new Date(item.nextFollowUp).toLocaleDateString("en-ET", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                      <Badge variant={item.stage as "lead" | "qualified" | "meeting" | "proposal" | "negotiation" | "won" | "project" | "support"} className="text-[10px] flex-shrink-0 capitalize">
                        {item.stage}
                      </Badge>
                    </>
                  )}
                </div>
              ))}
              {!loading && (data?.upcomingFollowUps ?? []).length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">No upcoming follow-ups</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-violet-500" />
                  Alerts
                </CardTitle>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(loading ? Array(3).fill(null) : (data?.notifications?.slice(0, 4) ?? [])).map((notif, i) => (
                <div
                  key={notif?.id ?? i}
                  className={cn(
                    "flex items-start gap-2.5 p-2 rounded-lg transition-colors",
                    !loading && !notif?.isRead && "bg-violet-50 dark:bg-violet-900/10"
                  )}
                >
                  {loading ? (
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full" />
                  ) : (
                    <>
                      <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5", (NOTIFICATION_COLORS[notif.type] ?? "text-slate-500").replace("text-", "bg-"))} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{notif.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">{notif.message}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Clients */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Top Clients</CardTitle>
              <CardDescription>Ranked by total lifetime value</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/clients">View all clients</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Industry</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {(loading ? Array(5).fill(null) : (data?.topClients ?? [])).map((client, i) => (
                  <tr key={client?.id ?? i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      {loading ? (
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <UserAvatar name={client.name} size="sm" />
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">{client.name}</div>
                            <div className="text-xs text-slate-500">{client.company}</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 hidden md:table-cell">
                      {!loading && (
                        <Badge variant="secondary" className="text-[10px]">{client.industry}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {loading ? (
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-20 ml-auto" />
                      ) : (
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(parseFloat(client.totalRevenue ?? "0"))}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center hidden sm:table-cell">
                      {!loading && <Badge variant="success" className="text-[10px]">Active</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
