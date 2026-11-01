"use client";

import React, { useEffect, useState } from "react";
import { FileText, Plus, Send, CheckCircle, Clock, AlertTriangle, XCircle, Eye, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: string | null;
  taxAmount: string | null;
  total: string | null;
  currency: string | null;
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
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

export function InvoicesContent() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [summary, setSummary] = useState({ totalRevenue: 0 });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), ...(statusFilter && { status: statusFilter }) });
    fetch(`/api/invoices?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setInvoices(d.data ?? []);
        setSummary(d.summary ?? { totalRevenue: 0 });
        setPagination(d.pagination ?? { total: 0, pages: 1 });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter, page]);

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

  const totalPaid = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + parseFloat(i.total ?? "0"), 0);
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
            onClick={() => {
              setLoading(true);
              setStatusFilter(id);
            }}
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
                ? Array(4).fill(null).map((_, i) => (
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
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon-sm">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm">
                              <Send className="w-3.5 h-3.5" />
                            </Button>
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
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No invoices yet</h3>
              <p className="text-sm text-slate-500 mt-1">Create your first invoice to start tracking payments</p>
              <Button className="mt-4">
                <Plus className="w-4 h-4" /> Create Invoice
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
