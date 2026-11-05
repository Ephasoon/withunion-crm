import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { canManageTeam, canWrite, requireApiUser } from "@/lib/auth";
import { isForeignKeyViolation } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : (typeof v === "string" ? v.trim() : v);

const updateClientSchema = z
  .object({
    name: z.preprocess(emptyToUndefined, z.string().min(1, "Name is required").max(160).optional()),
    email: z.preprocess(emptyToUndefined, z.string().email().max(254).optional()),
    phone: z.preprocess(emptyToUndefined, z.string().max(50).optional()),
    company: z.preprocess(emptyToUndefined, z.string().max(160).optional()),
    industry: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
    website: z.preprocess((v) => {
      if (typeof v !== "string") return v;
      const t = v.trim();
      if (t === "") return undefined;
      if (!/^[a-z][a-z0-9+.\-]*:/i.test(t)) return "https://" + t;
      return t;
    }, z.string().url("Invalid website URL").max(300).optional().refine((v) => {
      if (v === undefined) return true;
      try {
        const u = new URL(v);
        return u.hostname === "localhost" || u.hostname.includes(".");
      } catch {
        return false;
      }
    }, "Invalid website URL")),
    address: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
    city: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
    country: z.preprocess(emptyToUndefined, z.string().max(120).optional()),
    tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    notes: z.preprocess(emptyToUndefined, z.string().max(5000).optional()),
    assignedToId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
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
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const fields = Object.fromEntries(
        Object.entries(fieldErrors).map(([k, v]) => [k, (v && v[0]) || "Invalid value"])
      );
      return NextResponse.json(
        { error: "Invalid client data", fields, issues: fieldErrors },
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
