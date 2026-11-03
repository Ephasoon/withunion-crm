"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  FileText, Plus, Send, CheckCircle, Clock, AlertTriangle, XCircle, Eye,
  Download, Pencil, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: string | null;
  taxRate: string | null;
  taxAmount: string | null;
  discount: string | null;
  total: string | null;
  currency: string | null;
  notes: string | null;
  terms: string | null;
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  clientId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  clientName: string | null;
  clientCompany: string | null;
  clientEmail: string | null;
  projectName: string | null;
};

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: FileText, variant: "secondary" as const, color: "text-slate-500" },
  sent: { label: "Sent", icon: Send, variant: "info" as const, color: "text-blue-500" },
  viewed: { label: "Viewed", icon: Eye, variant: "info" as const, color: "text-blue-500" },
  paid: { label: "Paid", icon: CheckCircle, variant: "success" as const, color: "text-emerald-500" },
  overdue: { label: "Overdue", icon: AlertTriangle, variant: "destructive" as const, color: "text-red-500" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "secondary" as const, color: "text-slate-400" },
};

function daysFromNow(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function dateInputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function InvoiceFormModal({
  invoice,
  onClose,
  onSaved,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: dateInputValue(invoice.issueDate),
    dueDate: dateInputValue(invoice.dueDate),
    subtotal: invoice.subtotal ?? "0",
    taxRate: invoice.taxRate ?? "0",
    taxAmount: invoice.taxAmount ?? "0",
    discount: invoice.discount ?? "0",
    total: invoice.total ?? "0",
    notes: invoice.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        invoiceNumber: form.invoiceNumber,
        status: form.status,
        issueDate: form.issueDate ? new Date(form.issueDate).toISOString() : "",
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : "",
        subtotal: form.subtotal === "" ? 0 : Number(form.subtotal),
        taxRate: form.taxRate === "" ? 0 : Number(form.taxRate),
        taxAmount: form.taxAmount === "" ? 0 : Number(form.taxAmount),
        discount: form.discount === "" ? 0 : Number(form.discount),
        total: form.total === "" ? 0 : Number(form.total),
        notes: form.notes,
      };

      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to save invoice");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Edit Invoice</h2>
            <p className="text-xs text-slate-500 mt-0.5">{invoice.clientName ?? "Client"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Invoice Number *</label>
              <Input required value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Status</label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {Object.entries(STATUS_CONFIG).map(([id, config]) => (
                  <option key={id} value={id}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Issue Date</label>
              <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Subtotal</label>
              <Input type="number" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Tax Rate (%)</label>
              <Input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Tax Amount</label>
              <Input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Discount</label>
              <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Total</label>
              <Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InvoicesContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState({ totalRevenue: 0 });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState<Invoice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) throw new Error("Failed to load invoices");
      const data = await res.json();
      setInvoices(data.data ?? []);
      setSummary(data.summary ?? { totalRevenue: 0 });
      setPagination(data.pagination ?? { total: 0, pages: 1 });
    } catch {
      setError("Failed to load invoices. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(fetchInvoices, 0);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const changeStatus = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusyId(target.id);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to delete invoice");
      }
      setDeleting(null);
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete invoice");
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const getStatusDaysLabel = (invoice: Invoice) => {
    if (invoice.status === "paid" && invoice.paidAt) {
      return `Paid ${formatDate(invoice.paidAt)}`;
    }
    if (invoice.status === "overdue" && invoice.dueDate) {
      return `${-daysFromNow(invoice.dueDate)} days overdue`;
    }
    if (invoice.dueDate) {
      const days = daysFromNow(invoice.dueDate);
      return days > 0 ? `Due in ${days} days` : "Due today";
    }
    return null;
  };

  const totalPending = invoices.filter(i => ["sent", "viewed"].includes(i.status)).reduce((sum, i) => sum + parseFloat(i.total ?? "0"), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((sum, i) => sum + parseFloat(i.total ?? "0"), 0);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Invoices</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create and manage invoices, track payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4" /> Create Invoice
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: summary.totalRevenue, color: "bg-emerald-500", icon: CheckCircle },
          { label: "Pending", value: totalPending, color: "bg-blue-500", icon: Clock },
          { label: "Overdue", value: totalOverdue, color: "bg-red-500", icon: AlertTriangle },
          { label: "Total Invoices", value: pagination.total, color: "bg-violet-500", icon: FileText, isCount: true },
        ].map(({ label, value, color, icon: Icon, isCount }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {loading ? "—" : isCount ? value : formatCurrency(value as number)}
                  </p>
                </div>
                <div className={cn("p-2.5 rounded-xl", color)}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {[{ id: "", label: "All" }, ...Object.entries(STATUS_CONFIG).map(([id, c]) => ({ id, label: c.label }))].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => changeStatus(id)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              statusFilter === id
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Client</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Project</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date Info</th>
                <th className="py-3 px-4 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading
                ? Array(6).fill(null).map((_, i) => (
                    <tr key={i}>
                      {Array(6).fill(null).map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : invoices.map((invoice) => {
                    const statusConf = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
                    const StatusIcon = statusConf.icon;
                    const daysLabel = getStatusDaysLabel(invoice);
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="text-sm font-bold text-violet-600 dark:text-violet-400 font-mono">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {invoice.issueDate ? formatDate(invoice.issueDate) : "—"}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{invoice.clientName ?? "—"}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[160px]">{invoice.clientEmail ?? ""}</div>
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[160px] block">
                            {invoice.projectName ?? "—"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={statusConf.variant} className="text-[10px]">
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusConf.label}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-base font-bold text-slate-900 dark:text-white">
                            {formatCurrency(parseFloat(invoice.total ?? "0"))}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          {daysLabel && (
                            <span className={cn(
                              "text-xs font-medium",
                              invoice.status === "overdue" ? "text-red-500" :
                              invoice.status === "paid" ? "text-emerald-500" :
                              "text-slate-500"
                            )}>
                              {daysLabel}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <a
                              href={`/api/invoices/${invoice.id}/pdf`}
                              download
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                              title="Download PDF"
                              aria-label={`Download PDF for ${invoice.invoiceNumber}`}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => setEditing(invoice)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                              title="Edit invoice"
                              aria-label={`Edit ${invoice.invoiceNumber}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(invoice)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              title="Delete invoice"
                              aria-label={`Delete ${invoice.invoiceNumber}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loading && invoices.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No invoices found</h3>
              <p className="text-sm text-slate-500 mt-1">
                {statusFilter ? "Try a different status filter" : "Create your first invoice to start tracking payments"}
              </p>
              <Button className="mt-4">
                <Plus className="w-4 h-4" /> Create Invoice
              </Button>
            </div>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-500">
              Showing {invoices.length} of {pagination.total} invoices
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 px-2">{page} / {pagination.pages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {editing && (
        <InvoiceFormModal
          invoice={editing}
          onClose={() => setEditing(null)}
          onSaved={fetchInvoices}
        />
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `Invoice ${deleting.invoiceNumber} will be permanently removed. This action cannot be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === deleting?.id}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              loading={busyId === deleting?.id}
              onClick={handleDelete}
            >
              Delete invoice
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
