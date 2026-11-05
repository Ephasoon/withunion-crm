import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import path from "node:path";
import { db } from "@/db";
import { clients, documents, projects } from "@/db/schema";
import { canWrite, requireApiUser } from "@/lib/auth";
import { env } from "@/config/env";
import { createStorageDriver, MAX_UPLOAD_BYTES } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  storedName: z.string().min(1),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  mimeType: z.string().min(1),
  name: z.string().min(1).max(255),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
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
      return NextResponse.json({ error: "Invalid confirmation request" }, { status: 400 });
    }

    const { storedName, size, mimeType, name, clientId, projectId } = parsed.data;

    if (!clientId && !projectId) {
      return NextResponse.json(
        { error: "A client or project is required" },
        { status: 400 }
      );
    }

    if (clientId && !(await verifyClient(auth.user.organizationId, clientId))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (projectId && !(await verifyProject(auth.user.organizationId, projectId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const driver = createStorageDriver();
    if (!(await driver.verifyObject(storedName, size))) {
      return NextResponse.json(
        { error: "Uploaded object not found or size mismatch" },
        { status: 404 }
      );
    }

    const extension = path.extname(storedName).toLowerCase().replace(/^\./, "");

    const [document] = await db
      .insert(documents)
      .values({
        organizationId: auth.user.organizationId,
        name,
        type: extension,
        url: storedName,
        size,
        mimeType,
        clientId: clientId ?? null,
        projectId: projectId ?? null,
        uploadedById: auth.user.id,
        metadata: { originalName: name },
      })
      .returning();

    return NextResponse.json(
      {
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        mimeType: document.mimeType,
        clientId: document.clientId,
        projectId: document.projectId,
        createdAt: document.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Documents confirm-upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
