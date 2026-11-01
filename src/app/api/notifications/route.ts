import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireApiUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark_read"), id: z.string().uuid() }),
  z.object({ action: z.literal("mark_all_read") }),
]);

const idSchema = z.object({ id: z.string().uuid() });

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const rows = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, auth.user.organizationId),
          eq(notifications.userId, auth.user.id)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(100);

    return NextResponse.json({
      data: rows,
      unread: rows.filter((row) => !row.isRead).length,
    });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const scope = and(
      eq(notifications.organizationId, auth.user.organizationId),
      eq(notifications.userId, auth.user.id)
    );

    if (parsed.data.action === "mark_all_read") {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(scope, eq(notifications.isRead, false)));
      return NextResponse.json({ ok: true });
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(scope, eq(notifications.id, parsed.data.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const parsed = idSchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid notification id", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.organizationId, auth.user.organizationId),
          eq(notifications.userId, auth.user.id),
          eq(notifications.id, parsed.data.id)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notifications API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
