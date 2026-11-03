import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { canManageTeam, canWrite, requireApiUser } from "@/lib/auth";
import { isForeignKeyViolation } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

const updateClientSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    email: z.string().trim().email().max(254).optional().or(z.literal("")),
    phone: z.string().trim().max(50).optional(),
    company: z.string().trim().max(160).optional(),
    industry: z.string().trim().max(120).optional(),
    website: z.string().trim().url().max(300).optional().or(z.literal("")),
    address: z.string().trim().max(300).optional(),
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    notes: z.string().trim().max(5000).optional(),
    assignedToId: z.string().uuid().optional().or(z.literal("")),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json({ error: "Your role cannot update clients" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
    }

    const parsed = updateClientSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid client data", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const updates: Partial<typeof clients.$inferInsert> = { updatedAt: new Date() };

    if (input.name !== undefined) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email || null;
    if (input.phone !== undefined) updates.phone = input.phone || null;
    if (input.company !== undefined) updates.company = input.company || null;
    if (input.industry !== undefined) updates.industry = input.industry || null;
    if (input.website !== undefined) updates.website = input.website || null;
    if (input.address !== undefined) updates.address = input.address || null;
    if (input.city !== undefined) updates.city = input.city || null;
    if (input.country !== undefined) updates.country = input.country || null;
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.notes !== undefined) updates.notes = input.notes || null;
    if (input.assignedToId !== undefined) updates.assignedToId = input.assignedToId || null;
    if (input.isActive !== undefined) updates.isActive = input.isActive;

    const [updated] = await db
      .update(clients)
      .set(updates)
      .where(and(eq(clients.id, id), eq(clients.organizationId, auth.user.organizationId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Clients PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canManageTeam(auth.user.role)) {
      return NextResponse.json(
        { error: "Only owners, admins and managers can delete clients" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid client id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.organizationId, auth.user.organizationId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        {
          error:
            "This client is linked to projects or invoices and cannot be deleted until those records are removed.",
        },
        { status: 409 }
      );
    }
    console.error("Clients DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
