"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/utils";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPT_ATTRIBUTE = ".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv";

type DocumentItem = {
  id: string;
  name: string;
  type: string;
  size: number | null;
  mimeType: string | null;
  clientId: string | null;
  projectId: string | null;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
};

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({
  clientId,
  projectId,
}: {
  clientId?: string;
  projectId?: string;
}) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scope = clientId ? `clientId=${encodeURIComponent(clientId)}` : `projectId=${encodeURIComponent(projectId ?? "")}`;

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents?${scope}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Unable to load documents");
      setDocuments(body?.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load documents");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    const timer = setTimeout(fetchDocuments, 0);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File is too large. Maximum size is 10 MB.");
      input.value = "";
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (clientId) form.append("clientId", clientId);
      if (projectId) form.append("projectId", projectId);

      const res = await fetch("/api/documents", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Unable to upload document");

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload document");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusyId(target.id);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${target.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Unable to delete document");
      setDeleting(null);
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete document");
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h3>
          <p className="text-xs text-slate-500">
            PDF, PNG, JPG, DOCX, XLSX or CSV up to 10 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-4 h-4" /> Upload
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array(3).fill(null).map((_, index) => (
            <div key={index} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-10 text-center">
          <Paperclip className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No documents yet</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900">
              <div className="p-2 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {document.name}
                </p>
                <p className="text-xs text-slate-400">
                  {document.type.toUpperCase()} · {formatFileSize(document.size)} ·{" "}
                  {formatDate(document.createdAt)}
                  {document.uploadedByName ? ` · ${document.uploadedByName}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={`/api/documents/${document.id}`}
                  className="p-2 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                  title="Download document"
                  aria-label={`Download ${document.name}`}
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setDeleting(document)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Delete document"
                  aria-label={`Delete ${document.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `"${deleting.name}" will be permanently removed. This action cannot be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === deleting?.id}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              loading={busyId === deleting?.id}
              onClick={handleDelete}
            >
              Delete document
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function DocumentsModal({
  title,
  clientId,
  projectId,
  onClose,
}: {
  title: string;
  clientId?: string;
  projectId?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Documents</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close documents"
          >
            ✕
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <DocumentsPanel clientId={clientId} projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
