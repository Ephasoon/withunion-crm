import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { canManageTeam, requireApiUser } from "@/lib/auth";
import {
  deleteStoredFile,
  readStoredFile,
  sanitizeDownloadName,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idSchema = z.string().uuid();

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
    }

    const [document] = await db
      .select({
        id: documents.id,
        name: documents.name,
        url: documents.url,
        mimeType: documents.mimeType,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.organizationId, auth.user.organizationId)
        )
      )
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const file = await readStoredFile(document.url);
    if (!file) {
      return NextResponse.json({ error: "Document file not found" }, { status: 404 });
    }

    return new NextResponse(file as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${sanitizeDownloadName(document.name)}"`,
        "Content-Length": String(file.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Document GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canManageTeam(auth.user.role)) {
      return NextResponse.json(
        { error: "Only owners, admins and managers can delete documents" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) {
      return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(documents)
      .where(
        and(
          eq(documents.id, id),
          eq(documents.organizationId, auth.user.organizationId)
        )
      )
      .returning({ id: documents.id, url: documents.url });

    if (!deleted) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await deleteStoredFile(deleted.url).catch((error) => {
      console.error("Document file delete error:", error);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Document DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
