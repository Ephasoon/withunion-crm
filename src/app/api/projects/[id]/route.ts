import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { canManageTeam, canWrite, requireApiUser } from "@/lib/auth";
import { isForeignKeyViolation } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

const STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;

const idSchema = z.string().uuid();

const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(STATUSES).optional(),
    startDate: z.string().datetime().optional().or(z.literal("")),
    dueDate: z.string().datetime().optional().or(z.literal("")),
    budget: z.union([z.string().trim(), z.number()]).optional(),
    spent: z.union([z.string().trim(), z.number()]).optional(),
    progress: z.coerce.number().int().min(0).max(100).optional(),
    clientId: z.string().uuid().optional().or(z.literal("")),
    managerId: z.string().uuid().optional().or(z.literal("")),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json({ error: "Your role cannot update projects" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const parsed = updateProjectSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid project data", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.status !== undefined) updates.status = input.status;
    if (input.startDate !== undefined) {
      updates.startDate = input.startDate ? new Date(input.startDate) : null;
    }
    if (input.dueDate !== undefined) {
      updates.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.budget !== undefined) {
      updates.budget = input.budget === "" ? "0" : String(input.budget);
    }
    if (input.spent !== undefined) {
      updates.spent = input.spent === "" ? "0" : String(input.spent);
    }
    if (input.progress !== undefined) updates.progress = input.progress;
    if (input.clientId !== undefined) updates.clientId = input.clientId || null;
    if (input.managerId !== undefined) updates.managerId = input.managerId || null;
    if (input.tags !== undefined) updates.tags = input.tags;

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(and(eq(projects.id, id), eq(projects.organizationId, auth.user.organizationId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Projects PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canManageTeam(auth.user.role)) {
      return NextResponse.json(
        { error: "Only owners, admins and managers can delete projects" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.organizationId, auth.user.organizationId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        {
          error:
            "This project is linked to invoices or other records and cannot be deleted until those are removed.",
        },
        { status: 409 }
      );
    }
    console.error("Projects DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
