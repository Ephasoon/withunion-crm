import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".xlsx": [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  ".csv": ["text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"],
};

export const ALLOWED_EXTENSIONS = Object.keys(MIME_BY_EXTENSION);
export const ACCEPT_ATTRIBUTE = ALLOWED_EXTENSIONS.join(",");

const STORED_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

export type UploadValidation =
  | { ok: true; extension: string; mimeType: string }
  | { ok: false; error: string };

export function validateUpload(
  filename: string,
  mimeType: string | null | undefined
): UploadValidation {
  const extension = path.extname(filename).toLowerCase();
  const allowedMimes = MIME_BY_EXTENSION[extension];

  if (!allowedMimes) {
    return {
      ok: false,
      error: "Unsupported file type. Allowed: pdf, png, jpg, jpeg, docx, xlsx, csv.",
    };
  }

  const normalizedMime = (mimeType ?? "").split(";")[0].trim().toLowerCase();

  if (!allowedMimes.includes(normalizedMime)) {
    return {
      ok: false,
      error: "The file MIME type does not match its extension.",
    };
  }

  return { ok: true, extension, mimeType: normalizedMime };
}

/** Rejects content that does not look like the claimed extension. */
export function contentMatchesExtension(buffer: Buffer, extension: string): boolean {
  if (buffer.length === 0) return false;

  switch (extension.toLowerCase()) {
    case ".pdf":
      return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    case ".png":
      return (
        buffer.length >= 8 &&
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      );
    case ".jpg":
    case ".jpeg":
      return (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      );
    case ".docx":
    case ".xlsx":
      return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    case ".csv":
      return true;
    default:
      return false;
  }
}

export function storageRoot(): string {
  return path.isAbsolute(env.storage.dir)
    ? env.storage.dir
    : path.join(/*turbopackIgnore: true*/ process.cwd(), env.storage.dir);
}

/**
 * Resolves a stored filename inside STORAGE_DIR. Rejects anything that could
 * escape the root (absolute paths, separators, traversal, malformed names).
 */
export function resolveStoredPath(storedName: string): string {
  if (!storedName || !STORED_NAME_PATTERN.test(storedName)) {
    throw new Error("Invalid stored filename");
  }

  const root = storageRoot();
  const candidate = path.resolve(/*turbopackIgnore: true*/ root, storedName);

  if (candidate !== root && !candidate.startsWith(root + path.sep)) {
    throw new Error("Resolved path escapes the storage directory");
  }

  return candidate;
}

/** Local driver: persisted files on disk (default, unchanged behaviour). */
export async function saveBuffer(
  buffer: Buffer,
  extension: string
): Promise<string> {
  const root = storageRoot();
  await mkdir(root, { recursive: true });

  const storedName = `${randomUUID()}${extension.toLowerCase()}`;
  const filePath = resolveStoredPath(storedName);

  await writeFile(filePath, buffer, { flag: "wx" });
  return storedName;
}

export async function readStoredFile(storedName: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveStoredPath(storedName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteStoredFile(storedName: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(storedName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/** Makes an original filename safe for a Content-Disposition header. */
export function sanitizeDownloadName(originalName: string): string {
  const base = originalName.replace(/^.*[\\/]/, "");
  const sanitized = base
    .replace(/[\r\n"]/g, " ")
    .replace(/[\\/:*?<>|]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim();

  return (sanitized || "document").slice(0, 120);
}

export function safeOriginalName(filename: string): string {
  const base = filename.replace(/^.*[\\/]/, "").trim();
  return (base || "document").slice(0, 255);
}

// ─── Storage driver interface ──────────────────────────────────────────────

export type StorageDriver = "local" | "supabase";

export interface StorageAdapter {
  saveBuffer(buffer: Buffer, extension: string): Promise<string>;
  readStoredFile(storedName: string): Promise<Buffer | null>;
  deleteStoredFile(storedName: string): Promise<void>;
  /** Returns a URL the browser can PUT the file to directly. */
  getUploadUrl(storedName: string, mimeType: string, size: number): Promise<{
    url: string;
  }>;
  /** Confirms an object exists and its byte size matches. */
  verifyObject(storedName: string, size: number): Promise<boolean>;
  /** Returns a short-lived signed download URL. */
  getDownloadUrl(storedName: string): Promise<string>;
}

function localAdapter(): StorageAdapter {
  return {
    saveBuffer,
    readStoredFile,
    deleteStoredFile,
    async getUploadUrl() {
      throw new Error("Direct browser uploads are not supported by the local driver");
    },
    async verifyObject(storedName, size) {
      const file = await readStoredFile(storedName);
      if (!file) return false;
      return file.length === size;
    },
    async getDownloadUrl(storedName) {
      throw new Error("Signed downloads are not supported by the local driver");
    },
  };
}

function supabaseAdapter(): StorageAdapter {
  const bucket = env.storage.supabaseBucket;
  if (!bucket) {
    throw new Error("SUPABASE_STORAGE_BUCKET is required when STORAGE_DRIVER=supabase");
  }
  const serviceKey = env.supabase.serviceKey;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required when STORAGE_DRIVER=supabase");
  }
  const base = `${env.supabase.url}/storage/v1`;

  const headers = () => ({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  });

  async function request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${base}/${path}`, {
      ...init,
      headers: { ...headers(), ...init.headers },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Supabase storage error ${res.status}: ${text.slice(0, 300)}`);
    }
    return res;
  }

  const objectPath = (storedName: string) => `object/${bucket}/${encodeURIComponent(storedName)}`;

  return {
    async saveBuffer(buffer, extension) {
      const storedName = `${randomUUID()}${extension.toLowerCase()}`;
      await request(objectPath(storedName), {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream", "x-upsert": "true" },
        body: buffer as unknown as BodyInit,
      });
      return storedName;
    },
    async readStoredFile(storedName) {
      const res = await request(objectPath(storedName));
      return Buffer.from(await res.arrayBuffer());
    },
    async deleteStoredFile(storedName) {
      try {
        await request(objectPath(storedName), { method: "DELETE" });
      } catch {
        // Best effort: object may already be gone.
      }
    },
    async getUploadUrl(storedName, mimeType, size) {
      const res = await request(
        `object/sign/upload/${bucket}/${encodeURIComponent(storedName)}?expires_in=3600`,
        { method: "POST" }
      );
      const data = (await res.json()) as { signedUrl?: string };
      return { url: data.signedUrl ?? `${base}/object/upload/${bucket}/${encodeURIComponent(storedName)}` };
    },
    async verifyObject(storedName, size) {
      try {
        const res = await request(objectPath(storedName));
        const contentLength = res.headers.get("content-length");
        return contentLength !== null ? Number(contentLength) === size : true;
      } catch {
        return false;
      }
    },
    async getDownloadUrl(storedName) {
      const res = await request(
        `object/sign/${bucket}/${encodeURIComponent(storedName)}?expires_in=900`
      );
      const data = (await res.json()) as { signedUrl?: string };
      return data.signedUrl ?? "";
    },
  };
}

export function createStorageDriver(): StorageAdapter {
  switch (env.storage.driver) {
    case "supabase":
      return supabaseAdapter();
    default:
      return localAdapter();
  }
}
