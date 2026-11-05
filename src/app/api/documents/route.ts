import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, documents, projects, users } from "@/db/schema";
import { canWrite, requireApiUser } from "@/lib/auth";
import { env } from "@/config/env";
import {
  contentMatchesExtension,
  createStorageDriver,
  deleteStoredFile,
  MAX_UPLOAD_BYTES,
  safeOriginalName,
  saveBuffer,
  validateUpload,
} from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const listQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

const linkSchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

function stringValue(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

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

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      clientId: searchParams.get("clientId") ?? undefined,
      projectId: searchParams.get("projectId") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid document filter" }, { status: 400 });
    }

    const { clientId, projectId } = parsed.data;

    if (clientId && !(await verifyClient(auth.user.organizationId, clientId))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (projectId && !(await verifyProject(auth.user.organizationId, projectId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const conditions = [eq(documents.organizationId, auth.user.organizationId)];
    if (clientId) conditions.push(eq(documents.clientId, clientId));
    if (projectId) conditions.push(eq(documents.projectId, projectId));

    const rows = await db
      .select({
        id: documents.id,
        name: documents.name,
        type: documents.type,
        size: documents.size,
        mimeType: documents.mimeType,
        clientId: documents.clientId,
        projectId: documents.projectId,
        uploadedById: documents.uploadedById,
        uploadedByName: users.name,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedById, users.id))
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(100);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Documents GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let storedName: string | undefined;

  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!canWrite(auth.user.role)) {
      return NextResponse.json(
        { error: "Your role cannot upload documents" },
        { status: 403 }
      );
    }

    if (env.storage.driver === "supabase") {
      return NextResponse.json(
        { error: "Use /api/documents/upload-url for direct browser uploads" },
        { status: 400 }
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "A file is required" }, { status: 400 });
    }

    const parsedLinks = linkSchema.safeParse({
      clientId: stringValue(form.get("clientId")),
      projectId: stringValue(form.get("projectId")),
    });

    if (!parsedLinks.success) {
      return NextResponse.json({ error: "Invalid client or project id" }, { status: 400 });
    }

    const { clientId, projectId } = parsedLinks.data;

    if (!clientId && !projectId) {
      return NextResponse.json(
        { error: "A client or project is required" },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "The file is empty" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10 MB." },
        { status: 413 }
      );
    }

    const validation = validateUpload(file.name, file.type);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!contentMatchesExtension(buffer, validation.extension)) {
      return NextResponse.json(
        { error: "File contents do not match the declared file type." },
        { status: 400 }
      );
    }

    if (clientId && !(await verifyClient(auth.user.organizationId, clientId))) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (projectId && !(await verifyProject(auth.user.organizationId, projectId))) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    storedName = await saveBuffer(buffer, validation.extension);

    const [document] = await db
      .insert(documents)
      .values({
        organizationId: auth.user.organizationId,
        name: safeOriginalName(file.name),
        type: validation.extension.replace(/^\./, ""),
        url: storedName,
        size: file.size,
        mimeType: validation.mimeType,
        clientId: clientId ?? null,
        projectId: projectId ?? null,
        uploadedById: auth.user.id,
        metadata: { originalName: safeOriginalName(file.name) },
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
    if (storedName) {
      await deleteStoredFile(storedName).catch(() => undefined);
    }
    console.error("Documents POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
