import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { canManageTeam, canWrite, requireApiUser } from "@/lib/auth";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

const STATUSES = ["draft", "sent", "viewed", "paid", "overdue", "cancelled"] as const;

const idSchema = z.string().uuid();

const updateInvoiceSchema = z
  .object({
    invoiceNumber: z.string().trim().min(1).max(60).optional(),
    status: z.enum(STATUSES).optional(),
    issueDate: z.string().datetime().optional().or(z.literal("")),
    dueDate: z.string().datetime().optional().or(z.literal("")),
    paidAt: z.string().datetime().optional().or(z.literal("")),
    subtotal: z.union([z.string().trim(), z.number()]).optional(),
    taxRate: z.union([z.string().trim(), z.number()]).optional(),
    taxAmount: z.union([z.string().trim(), z.number()]).optional(),
    discount: z.union([z.string().trim(), z.number()]).optional(),
    total: z.union([z.string().trim(), z.number()]).optional(),
    currency: z.string().trim().min(3).max(3).optional(),
    notes: z.string().trim().max(5000).optional(),
    terms: z.string().trim().max(5000).optional(),
    clientId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json({ error: "Your role cannot update invoices" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
    }

    const parsed = updateInvoiceSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid invoice data", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const updates: Partial<typeof invoices.$inferInsert> = { updatedAt: new Date() };

    if (input.invoiceNumber !== undefined) updates.invoiceNumber = input.invoiceNumber;
    if (input.status !== undefined) updates.status = input.status;
    if (input.issueDate !== undefined) {
      updates.issueDate = input.issueDate ? new Date(input.issueDate) : null;
    }
    if (input.dueDate !== undefined) {
      updates.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }
    if (input.paidAt !== undefined) {
      updates.paidAt = input.paidAt ? new Date(input.paidAt) : null;
    }
    if (input.subtotal !== undefined) {
      updates.subtotal = input.subtotal === "" ? "0" : String(input.subtotal);
    }
    if (input.taxRate !== undefined) {
      updates.taxRate = input.taxRate === "" ? "0" : String(input.taxRate);
    }
    if (input.taxAmount !== undefined) {
      updates.taxAmount = input.taxAmount === "" ? "0" : String(input.taxAmount);
    }
    if (input.discount !== undefined) {
      updates.discount = input.discount === "" ? "0" : String(input.discount);
    }
    if (input.total !== undefined) {
      updates.total = input.total === "" ? "0" : String(input.total);
    }
    if (input.currency !== undefined) updates.currency = input.currency.toUpperCase();
    if (input.notes !== undefined) updates.notes = input.notes || null;
    if (input.terms !== undefined) updates.terms = input.terms || null;
    if (input.clientId !== undefined) updates.clientId = input.clientId;
    if (input.projectId !== undefined) updates.projectId = input.projectId || null;

    const [updated] = await db
      .update(invoices)
      .set(updates)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, auth.user.organizationId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "An invoice with that number already exists for this organization." },
        { status: 409 }
      );
    }
    console.error("Invoices PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canManageTeam(auth.user.role)) {
      return NextResponse.json(
        { error: "Only owners, admins and managers can delete invoices" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.organizationId, auth.user.organizationId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json(
        {
          error:
            "This invoice is linked to payments or commissions and cannot be deleted until those are removed.",
        },
        { status: 409 }
      );
    }
    console.error("Invoices DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
