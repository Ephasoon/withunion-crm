import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { canManageTeam, requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const numeric = z.union([z.string(), z.number()]);

const organizationSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  industry: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  website: z.string().trim().url().max(300).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  timezone: z.string().trim().max(80).optional(),
  taxRate: numeric.optional(),
});

const commissionRulesSchema = z.object({
  defaultRate: z.coerce.number().min(0).max(100).optional(),
  salesRepRate: z.coerce.number().min(0).max(100).optional(),
  managerOverrideRate: z.coerce.number().min(0).max(100).optional(),
  monthlyBonusThreshold: z.coerce.number().min(0).optional(),
});

const securitySchema = z.object({
  twoFactor: z.boolean().optional(),
  sessionTimeout: z.boolean().optional(),
  auditLogging: z.boolean().optional(),
  ipAllowlist: z.boolean().optional(),
  dataEncryption: z.boolean().optional(),
});

const patchSchema = z
  .object({
    organization: organizationSchema.optional(),
    commissionRules: commissionRulesSchema.optional(),
    security: securitySchema.optional(),
  })
  .refine(
    (data) => Boolean(data.organization || data.commissionRules || data.security),
    { message: "No settings to update" }
  );

const DEFAULT_SECURITY = {
  twoFactor: false,
  sessionTimeout: true,
  auditLogging: true,
  ipAllowlist: false,
  dataEncryption: true,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function buildResponse(org: typeof organizations.$inferSelect) {
  const settings = asRecord(org.settings);
  const commissions = asRecord(settings.commissions);
  const security = asRecord(settings.security);
  const defaultRate = readNumber(org.commissionRate, 5);

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      industry: org.industry,
      website: org.website,
      phone: org.phone,
      email: org.email,
      address: org.address,
      city: org.city,
      country: org.country,
      currency: org.currency ?? "ETB",
      timezone: org.timezone ?? "Africa/Addis_Ababa",
      plan: org.plan,
      taxRate: readNumber(org.taxRate, 15),
      commissionRate: defaultRate,
    },
    commissionRules: {
      defaultRate,
      salesRepRate: readNumber(commissions.salesRepRate, defaultRate),
      managerOverrideRate: readNumber(commissions.managerOverrideRate, 2),
      monthlyBonusThreshold: readNumber(commissions.monthlyBonusThreshold, 1_000_000),
    },
    security: {
      twoFactor: readBoolean(security.twoFactor, DEFAULT_SECURITY.twoFactor),
      sessionTimeout: readBoolean(security.sessionTimeout, DEFAULT_SECURITY.sessionTimeout),
      auditLogging: readBoolean(security.auditLogging, DEFAULT_SECURITY.auditLogging),
      ipAllowlist: readBoolean(security.ipAllowlist, DEFAULT_SECURITY.ipAllowlist),
      dataEncryption: readBoolean(security.dataEncryption, DEFAULT_SECURITY.dataEncryption),
    },
  };
}

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, auth.user.organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(buildResponse(org));
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canManageTeam(auth.user.role)) {
      return NextResponse.json(
        { error: "Only owners, admins and managers can change settings" },
        { status: 403 }
      );
    }

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid settings data", issues: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, auth.user.organizationId))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const input = parsed.data;
    const updates: Partial<typeof organizations.$inferInsert> = {
      updatedAt: new Date(),
    };
    const settings = asRecord(org.settings);
    const nextSettings: Record<string, unknown> = { ...settings };

    if (input.organization) {
      const orgInput = input.organization;
      if (orgInput.name !== undefined) updates.name = orgInput.name;
      if (orgInput.industry !== undefined) updates.industry = orgInput.industry || null;
      if (orgInput.email !== undefined) updates.email = orgInput.email || null;
      if (orgInput.phone !== undefined) updates.phone = orgInput.phone || null;
      if (orgInput.website !== undefined) updates.website = orgInput.website || null;
      if (orgInput.address !== undefined) updates.address = orgInput.address || null;
      if (orgInput.city !== undefined) updates.city = orgInput.city || null;
      if (orgInput.country !== undefined) updates.country = orgInput.country || null;
      if (orgInput.currency !== undefined) {
        updates.currency = orgInput.currency.toUpperCase();
      }
      if (orgInput.timezone !== undefined) updates.timezone = orgInput.timezone;
      if (orgInput.taxRate !== undefined) {
        updates.taxRate = String(orgInput.taxRate === "" ? 0 : orgInput.taxRate);
      }
    }

    if (input.commissionRules) {
      nextSettings.commissions = {
        ...asRecord(settings.commissions),
        ...input.commissionRules,
      };
      if (input.commissionRules.defaultRate !== undefined) {
        updates.commissionRate = String(input.commissionRules.defaultRate);
      }
    }

    if (input.security) {
      nextSettings.security = {
        ...asRecord(settings.security),
        ...input.security,
      };
    }

    updates.settings = nextSettings;

    const [updated] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, auth.user.organizationId))
      .returning();

    return NextResponse.json({ ok: true, settings: buildResponse(updated) });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
