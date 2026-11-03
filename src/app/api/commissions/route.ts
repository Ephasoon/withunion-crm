import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { commissions, deals, users } from "@/db/schema";
import { and, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "short", year: "numeric" });
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

    const selectedMonth = parsed.data.month;

    const now = new Date();
    const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const conditions = [eq(commissions.organizationId, orgId)];
    if (selectedMonth) conditions.push(eq(commissions.month, selectedMonth));

    const [leaderboard, trendRows, transactions, summaryRows] =
      await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            title: users.title,
            role: users.role,
            commission: sum(commissions.amount),
            baseAmount: sum(commissions.baseAmount),
            paid: sql<string>`coalesce(sum(case when ${commissions.isPaid} then ${commissions.amount} else 0 end), 0)`,
            pending: sql<string>`coalesce(sum(case when ${commissions.isPaid} then 0 else ${commissions.amount} end), 0)`,
            rate: sql<string>`coalesce(avg(${commissions.rate}), 0)`,
            totalDeals: sql<number>`count(distinct ${commissions.dealId})`,
          })
          .from(commissions)
          .innerJoin(users, eq(commissions.userId, users.id))
          .where(eq(commissions.organizationId, orgId))
          .groupBy(users.id, users.name, users.title, users.role),

        db
          .select({
            month: commissions.month,
            total: sum(commissions.amount),
          })
          .from(commissions)
          .where(eq(commissions.organizationId, orgId))
          .groupBy(commissions.month),

        db
          .select({
            id: commissions.id,
            amount: commissions.amount,
            rate: commissions.rate,
            baseAmount: commissions.baseAmount,
            isPaid: commissions.isPaid,
            paidAt: commissions.paidAt,
            month: commissions.month,
            createdAt: commissions.createdAt,
            repName: users.name,
            repTitle: users.title,
            dealTitle: deals.title,
          })
          .from(commissions)
          .innerJoin(users, eq(commissions.userId, users.id))
          .leftJoin(deals, eq(commissions.dealId, deals.id))
          .where(and(...conditions))
          .orderBy(desc(commissions.createdAt))
          .limit(100),

        db
          .select({
            total: sum(commissions.amount),
            paid: sql<string>`coalesce(sum(case when ${commissions.isPaid} then ${commissions.amount} else 0 end), 0)`,
            pending: sql<string>`coalesce(sum(case when ${commissions.isPaid} then 0 else ${commissions.amount} end), 0)`,
          })
          .from(commissions)
          .where(eq(commissions.organizationId, orgId)),
      ]);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentDay = now.getDate();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const daysInPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const previousRangeEnd = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      Math.min(currentDay, daysInPreviousMonth) + 1
    );

    const [currentMonthRows, previousMonthRows] = await Promise.all([
      db
        .select({ total: sum(commissions.amount) })
        .from(commissions)
        .where(
          and(
            eq(commissions.organizationId, orgId),
            gte(commissions.createdAt, currentMonthStart)
          )
        ),
      db
        .select({ total: sum(commissions.amount) })
        .from(commissions)
        .where(
          and(
            eq(commissions.organizationId, orgId),
            gte(commissions.createdAt, previousMonthStart),
            lt(commissions.createdAt, previousRangeEnd)
          )
        ),
    ]);

    const totalsByMonth = new Map<string, number>();
    for (const row of trendRows) {
      if (!row.month) continue;
      totalsByMonth.set(row.month, parseFloat(row.total ?? "0"));
    }

    const availableMonths = Array.from(
      new Set([...lastSixMonths, ...totalsByMonth.keys()])
    )
      .sort()
      .reverse();

    const effectiveMonth = selectedMonth ?? availableMonths[0] ?? null;

    const trend = [...lastSixMonths]
      .sort()
      .map((key) => ({
        key,
        month: monthLabel(key),
        amount: totalsByMonth.get(key) ?? 0,
      }));

    const currentRange = parseFloat(currentMonthRows[0]?.total ?? "0");
    const previousRange = parseFloat(previousMonthRows[0]?.total ?? "0");
    // Compare the same 1..N day window of the previous month. Hide the delta
    // while the current month is still too young to be meaningful.
    const growthPct =
      currentDay < 7 || previousRange <= 0
        ? null
        : Math.round(((currentRange - previousRange) / previousRange) * 1000) / 10;

    const sortedLeaderboard = leaderboard
      .map((row) => ({
        id: row.id,
        name: row.name,
        title: row.title,
        role: row.role,
        commission: parseFloat(row.commission ?? "0"),
        baseAmount: parseFloat(row.baseAmount ?? "0"),
        paid: parseFloat(row.paid ?? "0"),
        pending: parseFloat(row.pending ?? "0"),
        rate: Math.round(parseFloat(row.rate ?? "0") * 100) / 100,
        totalDeals: Number(row.totalDeals ?? 0),
      }))
      .sort((a, b) => b.commission - a.commission);

    const summary = summaryRows[0];

    return NextResponse.json({
      leaderboard: sortedLeaderboard,
      trend,
      transactions,
      months: availableMonths.map((key) => ({ key, label: monthLabel(key) })),
      selectedMonth: effectiveMonth,
      growthPct,
      summary: {
        total: parseFloat(summary?.total ?? "0"),
        paid: parseFloat(summary?.paid ?? "0"),
        pending: parseFloat(summary?.pending ?? "0"),
      },
    });
  } catch (error) {
    console.error("Commissions API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
