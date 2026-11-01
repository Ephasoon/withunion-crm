import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clients, invoices, payments } from "@/db/schema";
import { and, count, desc, eq, sum } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const statusSchema = z.enum(["pending", "completed", "failed", "refunded"]);

const querySchema = z.object({
  status: statusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

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

    const { status, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = [eq(payments.organizationId, orgId)];
    if (status) conditions.push(eq(payments.status, status));

    const [rows, statusTotals, methodTotals, totalRow] = await Promise.all([
      db
        .select({
          id: payments.id,
          amount: payments.amount,
          currency: payments.currency,
          method: payments.method,
          status: payments.status,
          reference: payments.reference,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
          clientName: clients.name,
          clientCompany: clients.company,
          invoiceNumber: invoices.invoiceNumber,
        })
        .from(payments)
        .leftJoin(clients, eq(payments.clientId, clients.id))
        .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({
          status: payments.status,
          total: sum(payments.amount),
          count: count(),
        })
        .from(payments)
        .where(eq(payments.organizationId, orgId))
        .groupBy(payments.status),

      db
        .select({
          method: payments.method,
          total: sum(payments.amount),
          count: count(),
        })
        .from(payments)
        .where(eq(payments.organizationId, orgId))
        .groupBy(payments.method),

      db
        .select({ count: count() })
        .from(payments)
        .where(and(...conditions)),
    ]);

    const summary = {
      received: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
      total: 0,
    };

    for (const row of statusTotals) {
      const value = parseFloat(row.total ?? "0");
      summary.total += value;
      if (row.status === "completed") summary.received = value;
      if (row.status === "pending") summary.pending = value;
      if (row.status === "failed") summary.failed = value;
      if (row.status === "refunded") summary.refunded = value;
    }

    return NextResponse.json({
      data: rows,
      summary,
      methods: methodTotals.map((row) => ({
        method: row.method ?? "unknown",
        total: parseFloat(row.total ?? "0"),
        count: Number(row.count),
      })),
      pagination: {
        page,
        limit,
        total: Number(totalRow[0]?.count ?? 0),
        totalPages: Math.max(1, Math.ceil(Number(totalRow[0]?.count ?? 0) / limit)),
      },
    });
  } catch (error) {
    console.error("Payments API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
