"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Search, Plus, Building2, Mail, Globe, Users,
  MapPin, Download, Pencil, Trash2, Paperclip,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, INDUSTRIES } from "@/lib/utils";
import { DocumentsModal } from "@/components/documents/documents-panel";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  industry: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  tags: string[] | null;
  totalRevenue: string | null;
  totalProjects: number | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedToAvatar: string | null;
};

function ClientFormModal({
  client,
  onClose,
  onSaved,
}: {
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    company: client?.company ?? "",
    industry: client?.industry ?? "",
    website: client?.website ?? "",
    address: client?.address ?? "",
    city: client?.city ?? "",
    notes: client?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch(client ? `/api/clients/${client.id}` : "/api/clients", {
        method: client ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.fields) setFieldErrors(body.fields);
        throw new Error(body?.error ?? "Unable to save client");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {client ? "Edit Client" : "Add New Client"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
              <Input required placeholder="Contact name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {fieldErrors.name && <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Email</label>
              <Input type="email" placeholder="email@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Phone</label>
              <Input placeholder="+251911..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Company</label>
              <Input placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              {fieldErrors.company && <p className="text-xs text-red-600 mt-1">{fieldErrors.company}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Industry</label>
              <select
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
              </select>
              {fieldErrors.industry && <p className="text-xs text-red-600 mt-1">{fieldErrors.industry}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">City</label>
              <Input placeholder="Addis Ababa" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              {fieldErrors.city && <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Website</label>
              <Input placeholder="https://company.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              {fieldErrors.website && <p className="text-xs text-red-600 mt-1">{fieldErrors.website}</p>}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Address</label>
              <Input placeholder="Street, area" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              {fieldErrors.address && <p className="text-xs text-red-600 mt-1">{fieldErrors.address}</p>}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              {fieldErrors.notes && <p className="text-xs text-red-600 mt-1">{fieldErrors.notes}</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={saving}>
              {client ? "Save Changes" : "Add Client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [documentsFor, setDocumentsFor] = useState<Client | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [page, setPage] = useState(1);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (search) params.set("search", search);
      if (industryFilter) params.set("industry", industryFilter);

      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) throw new Error("Failed to load clients");
      const data = await res.json();
      setClients(data.data ?? []);
      setPagination(data.pagination ?? { total: 0, pages: 1 });
    } catch {
      setError("Failed to load clients. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, industryFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeIndustry = (value: string) => {
    setIndustryFilter(value);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setBusyId(target.id);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Unable to delete client");
      }
      setDeleting(null);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete client");
      setDeleting(null);
    } finally {
      setBusyId(null);
    }
  };

  const industryColors: Record<string, string> = {
    Technology: "bg-blue-100 text-blue-700",
    Healthcare: "bg-red-100 text-red-700",
    Education: "bg-purple-100 text-purple-700",
    Restaurant: "bg-orange-100 text-orange-700",
    Construction: "bg-amber-100 text-amber-700",
    NGO: "bg-green-100 text-green-700",
    Sports: "bg-cyan-100 text-cyan-700",
    default: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Client Management</h2>
            <Badge variant="default" className="font-mono">{pagination.total}</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage client relationships, contracts, and lifetime value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          icon={<Search className="w-4 h-4" />}
          placeholder="Search clients by name, email, company..."
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={industryFilter}
          onChange={(e) => changeIndustry(e.target.value)}
        >
          <option value="">All Industries</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>{industry}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg border transition-colors ${viewMode === "grid" ? "border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-900/20" : "border-slate-200 text-slate-400 hover:border-slate-300 dark:border-slate-700"}`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-lg border transition-colors ${viewMode === "table" ? "border-violet-500 bg-violet-50 text-violet-600 dark:bg-violet-900/20" : "border-slate-200 text-slate-400 hover:border-slate-300 dark:border-slate-700"}`}
            aria-label="Table view"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="2" width="14" height="2" rx="0.5" /><rect x="1" y="7" width="14" height="2" rx="0.5" />
              <rect x="1" y="12" width="14" height="2" rx="0.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading
            ? Array(8).fill(null).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
                  </CardContent>
                </Card>
              ))
            : clients.map((client) => (
                <Card key={client.id} className="group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <UserAvatar name={client.name} size="lg" />
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => setDocumentsFor(client)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                          title="Documents"
                          aria-label={`Documents for ${client.name}`}
                        >
                          <Paperclip className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditing(client); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                          title="Edit client"
                          aria-label={`Edit ${client.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(client)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          title="Delete client"
                          aria-label={`Delete ${client.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{client.name}</h3>
                      {client.company && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                          {client.company}
                        </p>
                      )}
                      {client.email && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {client.email}
                        </p>
                      )}
                      {client.city && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {client.city}
                        </p>
                      )}
                      {client.website && (
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          {client.website}
                        </p>
                      )}
                    </div>
                    {client.industry && (
                      <div className="mt-3">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${industryColors[client.industry] ?? industryColors.default}`}>
                          {client.industry}
                        </span>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Revenue</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {formatCurrency(parseFloat(client.totalRevenue ?? "0"))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Projects</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {client.totalProjects ?? 0}
                        </p>
                      </div>
                    </div>
                    {client.assignedToName && (
                      <div className="mt-3 flex items-center gap-2">
                        <UserAvatar name={client.assignedToName} size="xs" />
                        <span className="text-xs text-slate-500 truncate">{client.assignedToName}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Industry</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Projects</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Assigned To</th>
                  <th className="py-3 px-4 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {loading
                  ? Array(5).fill(null).map((_, i) => (
                      <tr key={i}>
                        <td className="py-4 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-32" /></td>
                        {Array(6).fill(null).map((_, j) => (
                          <td key={j} className="py-4 px-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  : clients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={client.name} size="sm" />
                            <div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">{client.name}</div>
                              {client.email && <div className="text-xs text-slate-400 truncate max-w-[160px]">{client.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{client.company ?? "—"}</span>
                        </td>
                        <td className="py-3.5 px-4 hidden md:table-cell">
                          {client.industry && (
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${industryColors[client.industry] ?? industryColors.default}`}>
                              {client.industry}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(parseFloat(client.totalRevenue ?? "0"))}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {client.totalProjects ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 hidden lg:table-cell">
                          {client.assignedToName && (
                            <div className="flex items-center gap-2">
                              <UserAvatar name={client.assignedToName} size="xs" />
                              <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{client.assignedToName}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => setDocumentsFor(client)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                              title="Documents"
                              aria-label={`Documents for ${client.name}`}
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditing(client); setShowForm(true); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all"
                              title="Edit client"
                              aria-label={`Edit ${client.name}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(client)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              title="Delete client"
                              aria-label={`Delete ${client.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && clients.length === 0 && (
        <Card>
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No clients found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {search || industryFilter ? "Try adjusting your filters" : "Add your first client to start building relationships"}
            </p>
            <Button className="mt-4" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Add Client
            </Button>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4">
          <span className="text-sm text-slate-500">
            Showing {clients.length} of {pagination.total} clients
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

      {showForm && (
        <ClientFormModal
          client={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={fetchClients}
        />
      )}

      {documentsFor && (
        <DocumentsModal
          title={`Documents for ${documentsFor.name}`}
          clientId={documentsFor.id}
          onClose={() => setDocumentsFor(null)}
        />
      )}

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
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
              Delete client
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
