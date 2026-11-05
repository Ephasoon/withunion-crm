import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { canManageTeam, canWrite, requireApiUser } from "@/lib/auth";
import { isForeignKeyViolation } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

const STAGES = ["lead", "qualified", "meeting", "proposal", "negotiation", "won", "project", "support"] as const;
const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const;

const idSchema = z.string().uuid();

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : (typeof v === "string" ? v.trim() : v);

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : (typeof v === "string" ? v.trim() : v);

const updateLeadSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(160).optional(),
    email: z.preprocess(emptyToNull, z.string().email().max(254).nullable().optional()),
    phone: z.preprocess(emptyToNull, z.string().max(50).nullable().optional()),
    company: z.preprocess(emptyToNull, z.string().max(160).nullable().optional()),
    industry: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
    source: z.preprocess(emptyToNull, z.string().max(80).nullable().optional()),
    status: z.enum(STATUSES).optional(),
    stage: z.enum(STAGES).optional(),
    score: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(100).optional()),
    value: z.preprocess(emptyToUndefined, z.union([z.string().trim(), z.number()]).optional()),
    notes: z.preprocess(emptyToNull, z.string().max(5000).nullable().optional()),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    assignedToId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
    nextFollowUp: z.preprocess(emptyToNull, z.string().datetime().nullable().optional()),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json({ error: "Your role cannot update leads" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
    }

    const parsed = updateLeadSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const fields = Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, (v && v[0]) || "Invalid value"])
      );
      return NextResponse.json(
        { error: "Invalid lead data", fields, issues: fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const updates: Partial<typeof leads.$inferInsert> = { updatedAt: new Date() };

    if (input.name !== undefined) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email || null;
    if (input.phone !== undefined) updates.phone = input.phone || null;
    if (input.company !== undefined) updates.company = input.company || null;
    if (input.industry !== undefined) updates.industry = input.industry || null;
    if (input.source !== undefined) updates.source = input.source || null;
    if (input.status !== undefined) updates.status = input.status;
    if (input.stage !== undefined) updates.stage = input.stage;
    if (input.score !== undefined) updates.score = input.score;
    if (input.value !== undefined) {
      updates.value = input.value === "" ? "0" : String(input.value);
    }
    if (input.notes !== undefined) updates.notes = input.notes || null;
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.assignedToId !== undefined) updates.assignedToId = input.assignedToId || null;
    if (input.nextFollowUp !== undefined) {
      updates.nextFollowUp = input.nextFollowUp ? new Date(input.nextFollowUp) : null;
    }

    const [updated] = await db
      .update(leads)
      .set(updates)
      .where(and(eq(leads.id, id), eq(leads.organizationId, auth.user.organizationId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Leads PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canManageTeam(auth.user.role)) {
      return NextResponse.json(
        { error: "Only owners, admins and managers can delete leads" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(leads)
      .where(and(eq(leads.id, id), eq(leads.organizationId, auth.user.organizationId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        { error: "This lead is linked to deals or activities and cannot be deleted." },
        { status: 409 }
      );
    }
    console.error("Leads DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
