import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  aiInsights,
  clients,
  leads,
  deals,
  projects,
  payments,
  commissions,
  activities,
  notifications,
  users,
} from "@/db/schema";
import { eq, count, sum, desc, gte, lt, and, sql } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";
import { formatCompactCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Trend = {
  direction: "up" | "down" | "neutral";
  label: string;
};

function percentTrend(current: number, previous: number): Trend | null {
  if (previous <= 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return {
    direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
    label: `${change > 0 ? "+" : ""}${change}% vs prev 30d`,
  };
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const orgId = auth.user.organizationId;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalClients,
      totalLeads,
      activeProjects,
      totalRevenue,
      recentPayments,
      pendingCommissions,
      recentActivities,
      unreadNotifications,
      pipelineData,
      leadsByStage,
      topClients,
      teamMembers,
      newLeadsThisWeek,
      newClientsLast30,
      overdueProjects,
      paymentRows,
      allDeals,
      negotiationLeads,
      latestInsight,
    ] = await Promise.all([
      db.select({ count: count() }).from(clients).where(eq(clients.organizationId, orgId)),

      db.select({ count: count() }).from(leads).where(eq(leads.organizationId, orgId)),

      db
        .select({ count: count() })
        .from(projects)
        .where(and(eq(projects.organizationId, orgId), eq(projects.status, "active"))),

      db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(
          and(eq(payments.organizationId, orgId), eq(payments.status, "completed"))
        ),

      db
        .select({
          id: payments.id,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          paidAt: payments.paidAt,
          clientName: clients.name,
        })
        .from(payments)
        .leftJoin(clients, eq(payments.clientId, clients.id))
        .where(eq(payments.organizationId, orgId))
        .orderBy(desc(payments.createdAt))
        .limit(5),

      db
        .select({ total: sum(commissions.amount) })
        .from(commissions)
        .where(
          and(eq(commissions.organizationId, orgId), eq(commissions.isPaid, false))
        ),

      db
        .select({
          id: activities.id,
          type: activities.type,
          title: activities.title,
          description: activities.description,
          createdAt: activities.createdAt,
          userName: users.name,
          userAvatar: users.avatar,
        })
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .where(eq(activities.organizationId, orgId))
        .orderBy(desc(activities.createdAt))
        .limit(8),

      db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.organizationId, orgId),
            eq(notifications.userId, auth.user.id),
            eq(notifications.isRead, false)
          )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(10),

      db
        .select({
          stage: deals.stage,
          count: count(),
          totalValue: sum(deals.value),
        })
        .from(deals)
        .where(eq(deals.organizationId, orgId))
        .groupBy(deals.stage),

      db
        .select({ stage: leads.stage, count: count() })
        .from(leads)
        .where(eq(leads.organizationId, orgId))
        .groupBy(leads.stage),

      db
        .select({
          id: clients.id,
          name: clients.name,
          company: clients.company,
          totalRevenue: clients.totalRevenue,
          industry: clients.industry,
        })
        .from(clients)
        .where(eq(clients.organizationId, orgId))
        .orderBy(desc(sql`${clients.totalRevenue}::numeric`))
        .limit(5),

      db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          title: users.title,
          avatar: users.avatar,
        })
        .from(users)
        .where(and(eq(users.organizationId, orgId), eq(users.isActive, true)))
        .limit(10),

      db
        .select({ count: count() })
        .from(leads)
        .where(and(eq(leads.organizationId, orgId), gte(leads.createdAt, weekAgo))),

      db
        .select({ count: count() })
        .from(clients)
        .where(
          and(eq(clients.organizationId, orgId), gte(clients.createdAt, thirtyDaysAgo))
        ),

      db
        .select({ count: count() })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, orgId),
            eq(projects.status, "active"),
            lt(projects.dueDate, now)
          )
        ),

      db
        .select({ paidAt: payments.paidAt, amount: payments.amount })
        .from(payments)
        .where(
          and(
            eq(payments.organizationId, orgId),
            eq(payments.status, "completed"),
            gte(payments.paidAt, sixMonthsAgo)
          )
        ),

      db
        .select({
          stage: deals.stage,
          value: deals.value,
          createdAt: deals.createdAt,
          closedAt: deals.closedAt,
        })
        .from(deals)
        .where(eq(deals.organizationId, orgId)),

      db
        .select({ value: leads.value })
        .from(leads)
        .where(and(eq(leads.organizationId, orgId), eq(leads.stage, "negotiation"))),

      db
        .select({
          id: aiInsights.id,
          type: aiInsights.type,
          title: aiInsights.title,
          content: aiInsights.content,
          confidence: aiInsights.confidence,
          createdAt: aiInsights.createdAt,
        })
        .from(aiInsights)
        .where(eq(aiInsights.organizationId, orgId))
        .orderBy(desc(aiInsights.createdAt))
        .limit(1),
    ]);

    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const rows = paymentRows.filter(
        (row) => row.paidAt && row.paidAt >= start && row.paidAt < end
      );
      return {
        month: start.toLocaleString("en-US", { month: "short" }),
        revenue: rows.reduce((total, row) => total + Number(row.amount ?? 0), 0),
        count: rows.length,
      };
    });

    const revenueCurrent = paymentRows
      .filter((row) => row.paidAt && row.paidAt >= thirtyDaysAgo)
      .reduce((total, row) => total + Number(row.amount ?? 0), 0);

    const revenuePrior = paymentRows
      .filter(
        (row) =>
          row.paidAt && row.paidAt >= sixtyDaysAgo && row.paidAt < thirtyDaysAgo
      )
      .reduce((total, row) => total + Number(row.amount ?? 0), 0);

    const wonCount = allDeals.filter((row) => row.stage === "won").length;
    const totalCount = allDeals.length;
    const conversionRate =
      totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

    const currentDeals = allDeals.filter((row) => row.createdAt >= thirtyDaysAgo);
    const priorDeals = allDeals.filter(
      (row) => row.createdAt >= sixtyDaysAgo && row.createdAt < thirtyDaysAgo
    );

    const currentConversion = currentDeals.length
      ? (currentDeals.filter((row) => row.stage === "won").length /
          currentDeals.length) *
        100
      : null;
    const priorConversion = priorDeals.length
      ? (priorDeals.filter((row) => row.stage === "won").length / priorDeals.length) *
        100
      : null;

    const conversionTrend: Trend | null =
      currentConversion !== null && priorConversion !== null
        ? (() => {
            const change = Math.round(currentConversion - priorConversion);
            return {
              direction: change > 0 ? "up" : change < 0 ? "down" : "neutral",
              label: `${change > 0 ? "+" : ""}${change} pts vs prev 30d`,
            };
          })()
        : null;

    const leadsWeekCount = Number(newLeadsThisWeek[0]?.count ?? 0);
    const clients30Count = Number(newClientsLast30[0]?.count ?? 0);
    const overdueCount = Number(overdueProjects[0]?.count ?? 0);
    const pendingCommissionValue = parseFloat(pendingCommissions[0]?.total ?? "0");

    const trends = {
      revenue: percentTrend(revenueCurrent, revenuePrior),
      leads:
        leadsWeekCount > 0
          ? ({ direction: "up", label: `+${leadsWeekCount} this week` } as Trend)
          : null,
      clients:
        clients30Count > 0
          ? ({ direction: "up", label: `+${clients30Count} in 30d` } as Trend)
          : null,
      projects:
        overdueCount > 0
          ? ({
              direction: "down",
              label: `${overdueCount} overdue`,
            } as Trend)
          : null,
      conversion: conversionTrend,
      commissions:
        pendingCommissionValue > 0
          ? ({
              direction: "neutral",
              label: `${formatCompactCurrency(pendingCommissionValue)} due`,
            } as Trend)
          : null,
    };

    const negotiationCount = negotiationLeads.length;
    const negotiationValue = negotiationLeads.reduce(
      (total, row) => total + Number(row.value ?? 0),
      0
    );

    const insight =
      latestInsight[0] ??
      ({
        id: null,
        type: "pipeline",
        title:
          negotiationCount > 0 ? "Negotiation pipeline" : "Pipeline status",
        content:
          negotiationCount > 0
            ? `${negotiationCount} lead${
                negotiationCount === 1 ? "" : "s"
              } in negotiation worth ${formatCompactCurrency(
                negotiationValue
              )}. Prioritize follow-ups within 48 hours to keep them moving.`
            : "No leads in negotiation yet. Add new leads to start building your pipeline.",
        confidence: null,
        createdAt: null,
      } as const);

    return NextResponse.json({
      kpis: {
        totalClients: totalClients[0]?.count ?? 0,
        totalLeads: totalLeads[0]?.count ?? 0,
        activeProjects: activeProjects[0]?.count ?? 0,
        totalRevenue: parseFloat(totalRevenue[0]?.total ?? "0"),
        pendingCommissions: pendingCommissionValue,
        conversionRate,
      },
      trends,
      insight,
      recentPayments,
      recentActivities,
      notifications: unreadNotifications,
      pipeline: pipelineData,
      leadsByStage,
      topClients,
      teamMembers,
      monthlyRevenue,
      upcomingFollowUps: await db
        .select({
          id: leads.id,
          name: leads.name,
          company: leads.company,
          stage: leads.stage,
          nextFollowUp: leads.nextFollowUp,
          assignedToName: users.name,
        })
        .from(leads)
        .leftJoin(users, eq(leads.assignedToId, users.id))
        .where(
          and(eq(leads.organizationId, orgId), gte(leads.nextFollowUp, now))
        )
        .orderBy(leads.nextFollowUp)
        .limit(5),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
