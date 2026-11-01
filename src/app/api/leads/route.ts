import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { eq, desc, and, ilike, or, count } from "drizzle-orm";
import { canWrite, requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STAGES = ["lead", "qualified", "meeting", "proposal", "negotiation", "won", "project", "support"] as const;

const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  source: z.string().trim().max(80).optional(),
  stage: z.enum(STAGES).optional(),
  value: z.union([z.string().trim(), z.number()]).optional(),
  notes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
  nextFollowUp: z.string().datetime().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const stage = searchParams.get("stage");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20") || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(leads.organizationId, auth.user.organizationId)];

    if (search) {
      conditions.push(
        or(
          ilike(leads.name, `%${search}%`),
          ilike(leads.email, `%${search}%`),
          ilike(leads.company, `%${search}%`)
        )!
      );
    }
    if (stage) {
      const parsed = z.enum(STAGES).safeParse(stage);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid stage filter" }, { status: 400 });
      }
      conditions.push(eq(leads.stage, parsed.data));
    }

    const [data, total] = await Promise.all([
      db
        .select({
          id: leads.id,
          name: leads.name,
          email: leads.email,
          phone: leads.phone,
          company: leads.company,
          industry: leads.industry,
          source: leads.source,
          status: leads.status,
          stage: leads.stage,
          score: leads.score,
          value: leads.value,
          tags: leads.tags,
          nextFollowUp: leads.nextFollowUp,
          createdAt: leads.createdAt,
          assignedToName: users.name,
          assignedToAvatar: users.avatar,
        })
        .from(leads)
        .leftJoin(users, eq(leads.assignedToId, users.id))
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ count: count() }).from(leads).where(and(...conditions)),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: total[0]?.count ?? 0,
        pages: Math.ceil((total[0]?.count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json({ error: "Your role cannot create leads" }, { status: 403 });
    }

    const parsed = createLeadSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid lead data", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const [lead] = await db
      .insert(leads)
      .values({
        organizationId: auth.user.organizationId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        company: input.company || null,
        industry: input.industry || null,
        source: input.source || null,
        stage: input.stage ?? "lead",
        value: input.value !== undefined && input.value !== "" ? String(input.value) : null,
        notes: input.notes || null,
        tags: input.tags ?? [],
        assignedToId: input.assignedToId || null,
        nextFollowUp: input.nextFollowUp ? new Date(input.nextFollowUp) : null,
      })
      .returning();

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Leads POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
