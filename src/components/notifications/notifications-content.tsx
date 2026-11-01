"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Bot,
  TrendingUp,
  FileText,
  CreditCard,
  AlertTriangle,
  Settings,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";

type NotifType = "lead" | "deal" | "invoice" | "payment" | "task" | "ai" | "system";

interface NotificationItem {
  id: string;
  type: NotifType;
  title: string;
  message: string | null;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const ICON_MAP: Record<NotifType, React.ElementType> = {
  ai: Bot,
  invoice: FileText,
  payment: CreditCard,
  deal: TrendingUp,
  lead: TrendingUp,
  task: AlertTriangle,
  system: Settings,
};

const COLOR_MAP: Record<NotifType, string> = {
  ai: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  invoice: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  payment: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  deal: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  lead: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  task: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  system: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function NotificationsContent() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<NotifType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) throw new Error("Request failed");
    return (await res.json()) as { data: NotificationItem[] };
  }, []);

  const applyNotifications = useCallback((json: { data: NotificationItem[] }) => {
    setNotifications(
      json.data.map((item) => ({ ...item, isRead: Boolean(item.isRead) }))
    );
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchNotifications()
      .then(applyNotifications)
      .catch(() => setError("Failed to load notifications"))
      .finally(() => setLoading(false));
  }, [applyNotifications, fetchNotifications]);

  useEffect(() => {
    let cancelled = false;
    fetchNotifications()
      .then((json) => {
        if (cancelled) return;
        applyNotifications(json);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load notifications");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyNotifications, fetchNotifications]);

  const markAllRead = async () => {
    setBusy("all");
    setActionError(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      if (!res.ok) throw new Error("Request failed");
      setNotifications((items) => items.map((item) => ({ ...item, isRead: true })));
    } catch {
      setActionError("Could not mark all notifications as read");
    } finally {
      setBusy(null);
    }
  };

  const markRead = async (id: string) => {
    setBusy(id);
    setActionError(null);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", id }),
      });
      if (!res.ok) throw new Error("Request failed");
      setNotifications((items) =>
        items.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
    } catch {
      setActionError("Could not update notification");
    } finally {
      setBusy(null);
    }
  };

  const deleteNotif = async (id: string) => {
    setBusy(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Request failed");
      setNotifications((items) => items.filter((item) => item.id !== id));
    } catch {
      setActionError("Could not delete notification");
    } finally {
      setBusy(null);
    }
  };

  const filtered =
    filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h2>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={unreadCount === 0 || busy !== null}
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        </div>
      </div>

      {(error || actionError) && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error ?? actionError}</span>
            </div>
            {error && (
              <button
                onClick={load}
                className="text-sm font-medium text-violet-600 hover:underline"
              >
                Retry
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["ai", "AI Insights"],
            ["deal", "Deals"],
            ["invoice", "Invoices"],
            ["payment", "Payments"],
            ["task", "Tasks"],
            ["system", "System"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            onClick={() => setFilter(type as NotifType | "all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              filter === type
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {!loading &&
          filtered.map((notif) => {
            const Icon = ICON_MAP[notif.type] ?? Bell;
            const iconStyle = COLOR_MAP[notif.type] ?? COLOR_MAP.system;
            return (
              <Card
                key={notif.id}
                className={cn(
                  "transition-all hover:shadow-md",
                  !notif.isRead &&
                    "border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
                        iconStyle
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4
                              className={cn(
                                "text-sm font-semibold truncate",
                                !notif.isRead
                                  ? "text-slate-900 dark:text-white"
                                  : "text-slate-700 dark:text-slate-300"
                              )}
                            >
                              {notif.title}
                            </h4>
                            {!notif.isRead && (
                              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-violet-500" />
                            )}
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-slate-400">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {notif.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notif.isRead && (
                            <button
                              onClick={() => markRead(notif.id)}
                              disabled={busy !== null}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50"
                              title="Mark as read"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotif(notif.id)}
                            disabled={busy !== null}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              No notifications
            </h3>
            <p className="text-sm text-slate-500 mt-1">You&apos;re all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
