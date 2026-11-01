import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { invoices, clients, projects } from "@/db/schema";
import { eq, desc, and, count, sum } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"] as const;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const orgId = auth.user.organizationId;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20") || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(invoices.organizationId, orgId)];
    if (status) {
      const parsed = z.enum(STATUSES).safeParse(status);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
      }
      conditions.push(eq(invoices.status, parsed.data));
    }

    const data = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        subtotal: invoices.subtotal,
        taxAmount: invoices.taxAmount,
        total: invoices.total,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
        clientName: clients.name,
        clientCompany: clients.company,
        clientEmail: clients.email,
        projectName: projects.name,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ count: count() }).from(invoices).where(and(...conditions));
    const [revenue] = await db
      .select({ total: sum(invoices.total) })
      .from(invoices)
      .where(and(eq(invoices.organizationId, orgId), eq(invoices.status, "paid")));

    return NextResponse.json({
      data,
      summary: {
        totalRevenue: parseFloat(revenue?.total ?? "0"),
      },
      pagination: {
        page,
        limit,
        total: total?.count ?? 0,
        pages: Math.ceil((total?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Invoices GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
