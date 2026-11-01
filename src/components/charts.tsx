"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#64748b"];

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  color: "inherit",
};

const compact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

export function RevenueAreaChart({
  data,
}: {
  data: { label: string; revenue: number; invoiced: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="inv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,0.15)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`ETB ${Number(v).toLocaleString()}`]}
        />
        <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#inv)" />
        <Area type="monotone" dataKey="revenue" name="Collected" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SourceBarChart({
  data,
}: {
  data: { source: string; value: number; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,130,150,0.15)" vertical={false} />
        <XAxis
          dataKey="source"
          tick={{ fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.replace("_", " ")}
        />
        <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`ETB ${Number(v).toLocaleString()}`, "Pipeline value"]}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function IndustryPieChart({
  data,
}: {
  data: { industry: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="industry"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`ETB ${Number(v).toLocaleString()}`]}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
