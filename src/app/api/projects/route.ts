import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { projects, clients, users, tasks } from "@/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;

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

    const conditions = [eq(projects.organizationId, orgId)];
    if (status) {
      const parsed = z.enum(STATUSES).safeParse(status);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
      }
      conditions.push(eq(projects.status, parsed.data));
    }

    const data = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        budget: projects.budget,
        spent: projects.spent,
        progress: projects.progress,
        tags: projects.tags,
        createdAt: projects.createdAt,
        clientName: clients.name,
        clientCompany: clients.company,
        managerName: users.name,
        managerAvatar: users.avatar,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(users, eq(projects.managerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ count: count() }).from(projects).where(and(...conditions));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: total?.count ?? 0,
        pages: Math.ceil((total?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Projects GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
