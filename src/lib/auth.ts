import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { organizations, sessions, users } from "@/db/schema";
import { env } from "@/config/env";
import { SESSION_COOKIE } from "./auth-constants";

export { SESSION_COOKIE };

export const SESSION_TTL_DAYS = env.auth.sessionTtlDays;

export type Role = (typeof users.$inferSelect)["role"];

export interface SessionUser {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  avatar: string | null;
  organizationName: string;
  currency: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  sales_rep: "Sales Rep",
  support: "Support",
  viewer: "Viewer",
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Resolves the signed-in user for the current request. Cached per request so
 * layouts, pages and route handlers share a single lookup.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      name: users.name,
      email: users.email,
      role: users.role,
      title: users.title,
      avatar: users.avatar,
      organizationName: organizations.name,
      currency: organizations.currency,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(organizations, eq(users.organizationId, organizations.id))
    .where(
      and(
        eq(sessions.token, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
        eq(users.isActive, true)
      )
    )
    .limit(1);

  if (!row) return null;

  return { ...row, currency: row.currency ?? "ETB" };
});

/** Redirects to the sign-in page when there is no valid session. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export type ApiAuth = { ok: true; user: SessionUser } | { ok: false; response: NextResponse };

/** Returns a 401 response instead of redirecting (for route handlers). */
export async function requireApiUser(): Promise<ApiAuth> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export async function requireApiRole(roles: readonly Role[]): Promise<ApiAuth> {
  const auth = await requireApiUser();
  if (!auth.ok) return auth;
  if (!roles.includes(auth.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return auth;
}

/** Any role except viewer may create or update records. */
export function canWrite(role: Role): boolean {
  return role !== "viewer";
}

export function isAdmin(role: Role): boolean {
  return role === "owner" || role === "admin";
}

export function canManageTeam(role: Role): boolean {
  return role === "owner" || role === "admin" || role === "manager";
}

/** Creates a DB-backed session and sets the httpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);

  await db.insert(sessions).values({
    userId,
    token: hashToken(token),
    expiresAt,
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    expires: expiresAt,
  });
}

/** Revokes the current session and clears the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.delete(sessions).where(eq(sessions.token, hashToken(token)));
  }

  store.delete({ name: SESSION_COOKIE, path: "/" });
}
