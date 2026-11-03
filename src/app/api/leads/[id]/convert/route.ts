import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, leads } from "@/db/schema";
import { canWrite, requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json(
        { error: "Your role cannot convert leads" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [lead] = await tx
        .select()
        .from(leads)
        .where(
          and(eq(leads.id, id), eq(leads.organizationId, auth.user.organizationId))
        )
        .limit(1);

      if (!lead) {
        return { status: 404 as const, body: { error: "Lead not found" } };
      }

      if (lead.convertedClientId) {
        return {
          status: 409 as const,
          body: {
            error: "Lead has already been converted to a client",
            clientId: lead.convertedClientId,
          },
        };
      }

      const [client] = await tx
        .insert(clients)
        .values({
          organizationId: auth.user.organizationId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          industry: lead.industry,
          notes: lead.notes,
          tags: lead.tags ?? [],
          assignedToId: lead.assignedToId,
        })
        .returning();

      const [updatedLead] = await tx
        .update(leads)
        .set({
          status: "converted",
          convertedClientId: client.id,
          convertedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(leads.id, id), eq(leads.organizationId, auth.user.organizationId))
        )
        .returning();

      return { status: 200 as const, body: { lead: updatedLead, client } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Lead convert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
