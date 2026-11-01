import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clients, commissions, deals, leads, payments, users } from "@/db/schema";
import { and, eq, gte, or } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PERIOD_MONTHS = { "1m": 1, "3m": 3, "6m": 6, "1y": 12 } as const;

const querySchema = z.object({
  period: z.enum(["1m", "3m", "6m", "1y"]).default("6m"),
});

const INDUSTRY_COLORS = [
  "#6366f1",
  "#ec4899",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#64748b",
];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const orgId = auth.user.organizationId;

    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { period } = parsed.data;
    const bucketCount = PERIOD_MONTHS[period];

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const start = new Date(
        currentMonthStart.getFullYear(),
        currentMonthStart.getMonth() - (bucketCount - 1 - i),
        1
      );
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return {
        key: monthKey(start),
        label: start.toLocaleString("en-US", { month: "short" }),
        start,
        end,
      };
    });

    const periodStart = buckets[0].start;
    const prevStart = new Date(
      periodStart.getFullYear(),
      periodStart.getMonth() - bucketCount,
      1
    );

    const [paymentRows, leadRows, dealRows, commissionRows, allDeals, allLeads, allClients] =
      await Promise.all([
        db
          .select({
            paidAt: payments.paidAt,
            amount: payments.amount,
            industry: clients.industry,
          })
          .from(payments)
          .leftJoin(clients, eq(payments.clientId, clients.id))
          .where(
            and(
              eq(payments.organizationId, orgId),
              eq(payments.status, "completed"),
              gte(payments.paidAt, prevStart)
            )
          ),

        db
          .select({
            createdAt: leads.createdAt,
            score: leads.score,
            nextFollowUp: leads.nextFollowUp,
          })
          .from(leads)
          .where(and(eq(leads.organizationId, orgId), gte(leads.createdAt, prevStart))),

        db
          .select({
            stage: deals.stage,
            value: deals.value,
            createdAt: deals.createdAt,
            closedAt: deals.closedAt,
          })
          .from(deals)
          .where(
            and(
              eq(deals.organizationId, orgId),
              or(gte(deals.createdAt, prevStart), gte(deals.closedAt, prevStart))
            )
          ),

        db
          .select({
            createdAt: commissions.createdAt,
            amount: commissions.amount,
            baseAmount: commissions.baseAmount,
            userId: commissions.userId,
            userName: users.name,
            dealId: commissions.dealId,
          })
          .from(commissions)
          .innerJoin(users, eq(commissions.userId, users.id))
          .where(
            and(
              eq(commissions.organizationId, orgId),
              gte(commissions.createdAt, prevStart)
            )
          ),

        db
          .select({ stage: deals.stage, value: deals.value })
          .from(deals)
          .where(eq(deals.organizationId, orgId)),

        db
          .select({ score: leads.score, nextFollowUp: leads.nextFollowUp })
          .from(leads)
          .where(eq(leads.organizationId, orgId)),

        db
          .select({ isActive: clients.isActive })
          .from(clients)
          .where(eq(clients.organizationId, orgId)),
      ]);

    const inRange = (value: Date | string | null, start: Date, end: Date) => {
      if (!value) return false;
      const date = value instanceof Date ? value : new Date(value);
      return date >= start && date < end;
    };

    const monthly = buckets.map((bucket) => {
      const revenue = paymentRows
        .filter((row) => inRange(row.paidAt, bucket.start, bucket.end))
        .reduce((total, row) => total + Number(row.amount ?? 0), 0);

      const expenses = commissionRows
        .filter((row) => inRange(row.createdAt, bucket.start, bucket.end))
        .reduce((total, row) => total + Number(row.amount ?? 0), 0);

      const leadCount = leadRows.filter((row) =>
        inRange(row.createdAt, bucket.start, bucket.end)
      ).length;

      const wonDeals = dealRows.filter(
        (row) =>
          row.stage === "won" && inRange(row.closedAt, bucket.start, bucket.end)
      );

      return {
        month: bucket.label,
        key: bucket.key,
        revenue,
        leads: leadCount,
        deals: wonDeals.length,
        expenses,
      };
    });

    const inWindow = (value: Date | string | null, start: Date, end: Date) =>
      inRange(value, start, end);

    const currentPayments = paymentRows.filter((row) =>
      inWindow(row.paidAt, periodStart, now)
    );
    const previousPayments = paymentRows.filter((row) =>
      inWindow(row.paidAt, prevStart, periodStart)
    );

    const currentLeads = leadRows.filter((row) =>
      inWindow(row.createdAt, periodStart, now)
    );
    const previousLeads = leadRows.filter((row) =>
      inWindow(row.createdAt, prevStart, periodStart)
    );

    const currentWonDeals = dealRows.filter(
      (row) =>
        row.stage === "won" && inWindow(row.closedAt, periodStart, now)
    );
    const previousWonDeals = dealRows.filter(
      (row) =>
        row.stage === "won" && inWindow(row.closedAt, prevStart, periodStart)
    );

    const totalRevenue = currentPayments.reduce(
      (total, row) => total + Number(row.amount ?? 0),
      0
    );
    const previousRevenue = previousPayments.reduce(
      (total, row) => total + Number(row.amount ?? 0),
      0
    );

    const wonValue = currentWonDeals.reduce(
      (total, row) => total + Number(row.value ?? 0),
      0
    );
    const previousWonValue = previousWonDeals.reduce(
      (total, row) => total + Number(row.value ?? 0),
      0
    );

    const avgDealSize = currentWonDeals.length
      ? wonValue / currentWonDeals.length
      : 0;
    const previousAvgDealSize = previousWonDeals.length
      ? previousWonValue / previousWonDeals.length
      : 0;

    const trendPercent = (current: number, previous: number) =>
      previous > 0
        ? Math.round(((current - previous) / previous) * 1000) / 10
        : null;

    const industryMap = new Map<string, number>();
    for (const row of currentPayments) {
      const key = row.industry ?? "Other";
      industryMap.set(key, (industryMap.get(key) ?? 0) + Number(row.amount ?? 0));
    }

    const industry = [...industryMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length],
      }));

    const repMap = new Map<
      string,
      { name: string; revenue: number; commission: number; deals: Set<string | null> }
    >();

    for (const row of commissionRows) {
      if (!inWindow(row.createdAt, periodStart, now)) continue;
      const entry = repMap.get(row.userId) ?? {
        name: row.userName,
        revenue: 0,
        commission: 0,
        deals: new Set<string | null>(),
      };
      entry.revenue += Number(row.baseAmount ?? 0);
      entry.commission += Number(row.amount ?? 0);
      entry.deals.add(row.dealId);
      repMap.set(row.userId, entry);
    }

    const salesReps = [...repMap.entries()]
      .map(([id, entry]) => ({
        id,
        name: entry.name,
        revenue: entry.revenue,
        commission: entry.commission,
        deals: entry.deals.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const allWonDeals = allDeals.filter((row) => row.stage === "won");
    const allWonValue = allWonDeals.reduce(
      (total, row) => total + Number(row.value ?? 0),
      0
    );
    const avgWonValue = allWonDeals.length
      ? allWonValue / allWonDeals.length
      : 0;
    const conversionRate = allDeals.length
      ? (allWonDeals.length / allDeals.length) * 100
      : 0;

    const scoredLeads = allLeads.filter((row) => (row.score ?? 0) > 0);
    const avgLeadScore = scoredLeads.length
      ? scoredLeads.reduce((total, row) => total + (row.score ?? 0), 0) /
        scoredLeads.length
      : 0;

    const followUpCoverage = allLeads.length
      ? (allLeads.filter((row) => row.nextFollowUp).length / allLeads.length) * 100
      : 0;

    const retention = allClients.length
      ? (allClients.filter((row) => row.isActive !== false).length /
          allClients.length) *
        100
      : 0;

    const healthyStages = new Set(["proposal", "negotiation", "won", "project"]);
    const pipelineHealth = allDeals.length
      ? (allDeals.filter((row) => healthyStages.has(row.stage)).length /
          allDeals.length) *
        100
      : 0;

    const performance = [
      { subject: "Lead Quality", value: clamp(avgLeadScore) },
      { subject: "Conversion Rate", value: clamp(conversionRate) },
      { subject: "Deal Size", value: clamp(avgWonValue / 20000) },
      { subject: "Follow-Up Coverage", value: clamp(followUpCoverage) },
      { subject: "Client Retention", value: clamp(retention) },
      { subject: "Pipeline Health", value: clamp(pipelineHealth) },
    ];

    const completedMonths = monthly.length > 1 ? monthly.slice(0, -1) : monthly;
    const recentMonths = completedMonths.slice(-3);
    const averageRevenue = recentMonths.length
      ? recentMonths.reduce((total, row) => total + row.revenue, 0) /
        recentMonths.length
      : 0;

    const growthBase =
      recentMonths.length >= 2 && recentMonths[recentMonths.length - 2].revenue > 0
        ? (recentMonths[recentMonths.length - 1].revenue -
            recentMonths[recentMonths.length - 2].revenue) /
          recentMonths[recentMonths.length - 2].revenue
        : 0.05;
    const growth = Math.max(-0.2, Math.min(0.25, growthBase));

    let forecastBase = averageRevenue;
    const forecast = Array.from({ length: 4 }, (_, i) => {
      forecastBase = forecastBase * (1 + growth);
      const monthDate = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
      return {
        month: monthDate.toLocaleString("en-US", { month: "short" }),
        forecast: Math.round(forecastBase),
        optimistic: Math.round(forecastBase * 1.2),
        conservative: Math.round(forecastBase * 0.85),
      };
    });

    const forecastSummary = {
      conservative: forecast.reduce((total, row) => total + row.conservative, 0),
      base: forecast.reduce((total, row) => total + row.forecast, 0),
      optimistic: forecast.reduce((total, row) => total + row.optimistic, 0),
    };

    return NextResponse.json({
      period,
      monthly,
      industry,
      salesReps,
      performance,
      forecast,
      forecastSummary,
      kpis: {
        totalRevenue,
        totalLeads: currentLeads.length,
        dealsClosed: currentWonDeals.length,
        avgDealSize,
        trends: {
          revenue: trendPercent(totalRevenue, previousRevenue),
          leads: trendPercent(currentLeads.length, previousLeads.length),
          deals: trendPercent(currentWonDeals.length, previousWonDeals.length),
          avgDeal: trendPercent(avgDealSize, previousAvgDealSize),
        },
      },
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
