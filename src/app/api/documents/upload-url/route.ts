import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { canWrite, requireApiUser } from "@/lib/auth";
import { env } from "@/config/env";
import { createStorageDriver, MAX_UPLOAD_BYTES, validateUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

async function verifyClient(organizationId: string, clientId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
    .limit(1);

  return Boolean(row);
}

async function verifyProject(organizationId: string, projectId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .limit(1);

  return Boolean(row);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json(
        { error: "Your role cannot upload documents" },
        { status: 403 }
      );
    }

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
    }

    const { clientId, projectId, filename, mimeType, size } = parsed.data;

    if (!clientId && !projectId) {
      return NextResponse.json(
        { error: "A client or project is required" },
        { status: 400 }
      );
    }

    const validation = validateUpload(filename, mimeType);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (clientId && !(await verifyClient(auth.user.organizationId, clientId))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (projectId && !(await verifyProject(auth.user.organizationId, projectId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (env.storage.driver !== "supabase") {
      return NextResponse.json(
        { error: "Direct browser uploads require STORAGE_DRIVER=supabase" },
        { status: 400 }
      );
    }

    // Never use the user's filename in the storage path.
    const storedName = `${randomUUID()}${validation.extension}`;
    const driver = createStorageDriver();
    const { url } = await driver.getUploadUrl(storedName, validation.mimeType, size);

    return NextResponse.json({ uploadUrl: url, storedName });
  } catch (error) {
    console.error("Documents upload-url error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
