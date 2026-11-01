import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    if (!rateLimit(`login:ip:${ip}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    const { email, password } = parsed.data;

    if (!rateLimit(`login:email:${email}`, 5, 5 * 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts for this account. Try again in a few minutes." },
        { status: 429 }
      );
    }

    const [account] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(and(eq(sql`lower(${users.email})`, email), eq(users.isActive, true)))
      .limit(1);

    if (!account) {
      await verifyAgainstDummy(password);
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await verifyPassword(password, account.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await db.delete(sessions).where(
      and(eq(sessions.userId, account.id), lt(sessions.expiresAt, new Date()))
    );
    await createSession(account.id);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, account.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/login", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
