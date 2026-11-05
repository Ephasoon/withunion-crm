import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { clients, users } from "@/db/schema";
import { eq, desc, and, ilike, or, count } from "drizzle-orm";
import { canWrite, requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : (typeof v === "string" ? v.trim() : v);

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
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
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  notes: z.preprocess(emptyToUndefined, z.string().max(5000).optional()),
  assignedToId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.slice(0, 120) ?? "";
    const industry = searchParams.get("industry");
    const city = searchParams.get("city");
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
    if (city) {
      conditions.push(ilike(clients.city, `%${city}%`));
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
          website: clients.website,
          address: clients.address,
          city: clients.city,
          notes: clients.notes,
          tags: clients.tags,
          totalRevenue: clients.totalRevenue,
          totalProjects: clients.totalProjects,
          isActive: clients.isActive,
          assignedToId: clients.assignedToId,
          createdAt: clients.createdAt,
          updatedAt: clients.updatedAt,
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
