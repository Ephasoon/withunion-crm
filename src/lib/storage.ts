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
