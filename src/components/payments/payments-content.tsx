"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatCompactCurrency, formatDate } from "@/lib/utils";

interface Payment {
  id: string;
  amount: string;
  currency: string | null;
  method: string | null;
  status: "pending" | "completed" | "failed" | "refunded";
  reference: string | null;
  paidAt: string | null;
  createdAt: string;
  clientName: string | null;
  clientCompany: string | null;
  invoiceNumber: string | null;
}

interface PaymentsResponse {
  data: Payment[];
  summary: {
    received: number;
    pending: number;
    failed: number;
    refunded: number;
    total: number;
  };
  methods: Array<{ method: string; total: number; count: number }>;
}

const METHOD_ORDER = ["bank_transfer", "telebirr", "chapa", "stripe"];

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  telebirr: "Telebirr",
  chapa: "Chapa",
  stripe: "Stripe",
  cash: "Cash",
};

const METHOD_COLORS: Record<string, string> = {
  "Bank Transfer": "bg-blue-100 text-blue-700",
  Telebirr: "bg-green-100 text-green-700",
  Chapa: "bg-orange-100 text-orange-700",
  Stripe: "bg-indigo-100 text-indigo-700",
  Cash: "bg-slate-100 text-slate-700",
};

const STATUS_VARIANT: Record<
  Payment["status"],
  "success" | "warning" | "destructive" | "secondary"
> = {
  completed: "success",
  pending: "warning",
  failed: "destructive",
  refunded: "secondary",
};

function methodLabel(method: string | null) {
  return method ? METHOD_LABELS[method] ?? method : "Unknown";
}

export function PaymentsContent() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentsResponse["summary"] | null>(null);
  const [methods, setMethods] = useState<PaymentsResponse["methods"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    const res = await fetch("/api/payments");
    if (!res.ok) throw new Error("Request failed");
    return (await res.json()) as PaymentsResponse;
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPayments()
      .then((json) => {
        setPayments(json.data);
        setSummary(json.summary);
        setMethods(json.methods);
      })
      .catch(() => setError("Failed to load payments"))
      .finally(() => setLoading(false));
  }, [fetchPayments]);

  useEffect(() => {
    let cancelled = false;
    fetchPayments()
      .then((json) => {
        if (cancelled) return;
        setPayments(json.data);
        setSummary(json.summary);
        setMethods(json.methods);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load payments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPayments]);

  const methodTotals = METHOD_ORDER.map((method) => {
    const entry = methods.find((item) => item.method === method);
    return {
      method,
      label: METHOD_LABELS[method],
      total: entry?.total ?? 0,
      count: entry?.count ?? 0,
    };
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payments</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Payment tracking across Chapa, Telebirr, Bank Transfer, and Stripe
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Received</p>
                <p className="text-xl font-bold text-emerald-600">
                  {loading ? "—" : formatCompactCurrency(summary?.received ?? 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending</p>
                <p className="text-xl font-bold text-amber-600">
                  {loading ? "—" : formatCompactCurrency(summary?.pending ?? 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500">
                <Clock className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Failed</p>
                <p className="text-xl font-bold text-red-600">
                  {loading ? "—" : formatCompactCurrency(summary?.failed ?? 0)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-red-500">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {methodTotals.map(({ method, label, total, count }) => (
          <Card key={method}>
            <CardContent className="p-4 text-center">
              <CreditCard className="w-6 h-6 mx-auto text-violet-500 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {loading ? "—" : formatCompactCurrency(total)}
              </p>
              <p className="text-[10px] text-slate-400">{count} transactions</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {["Reference", "Client", "Invoice", "Method", "Amount", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="py-3.5 px-4">
                        <div className="h-4 w-full max-w-[120px] bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading &&
                payments.map((payment) => {
                  const label = methodLabel(payment.method);
                  return (
                    <tr
                      key={payment.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-violet-600 dark:text-violet-400 font-semibold">
                        {payment.reference ?? "—"}
                      </td>
                      <td className="py-3.5 px-4 text-sm text-slate-900 dark:text-white font-medium">
                        {payment.clientName ?? payment.clientCompany ?? "Unknown"}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                        {payment.invoiceNumber ?? "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full",
                            METHOD_COLORS[label] ?? "bg-slate-100 text-slate-700"
                          )}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(Number(payment.amount), payment.currency ?? "ETB")}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={STATUS_VARIANT[payment.status] ?? "secondary"}
                          className="text-[10px] capitalize"
                        >
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {payment.paidAt ? formatDate(payment.paidAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {!loading && !error && payments.length === 0 && (
          <div className="text-center py-16">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No payments recorded
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Payments will appear here once invoices are settled.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
