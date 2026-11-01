import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clients, users } from "@/db/schema";
import { eq, desc, and, ilike, or, count } from "drizzle-orm";
import { canWrite, requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  website: z.string().trim().url().max(300).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  notes: z.string().trim().max(5000).optional(),
  assignedToId: z.string().uuid().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const industry = searchParams.get("industry");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20") || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(clients.organizationId, auth.user.organizationId)];
    if (search) {
      conditions.push(
        or(
          ilike(clients.name, `%${search}%`),
          ilike(clients.email, `%${search}%`),
          ilike(clients.company, `%${search}%`)
        )!
      );
    }
    if (industry) {
      conditions.push(ilike(clients.industry, `%${industry}%`));
    }

    const [data, total] = await Promise.all([
      db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          company: clients.company,
          industry: clients.industry,
          city: clients.city,
          tags: clients.tags,
          totalRevenue: clients.totalRevenue,
          totalProjects: clients.totalProjects,
          isActive: clients.isActive,
          createdAt: clients.createdAt,
          assignedToName: users.name,
          assignedToAvatar: users.avatar,
        })
        .from(clients)
        .leftJoin(users, eq(clients.assignedToId, users.id))
        .where(and(...conditions))
        .orderBy(desc(clients.createdAt))
        .limit(limit)
        .offset(offset),

      db.select({ count: count() }).from(clients).where(and(...conditions)),
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
    console.error("Clients GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json({ error: "Your role cannot create clients" }, { status: 403 });
    }

    const parsed = createClientSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid client data", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input = parsed.data;

    const [client] = await db
      .insert(clients)
      .values({
        organizationId: auth.user.organizationId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        company: input.company || null,
        industry: input.industry || null,
        website: input.website || null,
        address: input.address || null,
        city: input.city || null,
        tags: input.tags ?? [],
        notes: input.notes || null,
        assignedToId: input.assignedToId || null,
      })
      .returning();

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Clients POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
