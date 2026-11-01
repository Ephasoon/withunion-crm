import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "ETB"): string {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency = "ETB"): string {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.abs(amount));
  return `${currency} ${amount < 0 ? "-" : ""}${compact}`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const PIPELINE_STAGES = [
  { id: "lead", label: "Lead", color: "#6366f1" },
  { id: "qualified", label: "Qualified", color: "#8b5cf6" },
  { id: "meeting", label: "Meeting", color: "#ec4899" },
  { id: "proposal", label: "Proposal", color: "#f59e0b" },
  { id: "negotiation", label: "Negotiation", color: "#f97316" },
  { id: "won", label: "Won", color: "#10b981" },
  { id: "project", label: "Project", color: "#06b6d4" },
  { id: "support", label: "Support", color: "#64748b" },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]["id"];

export const LEAD_SOURCES = [
  "Google Forms",
  "Website",
  "Manual Entry",
  "Referral",
  "Social Media",
  "Cold Call",
  "Email Campaign",
  "Event",
  "Partner",
] as const;

export const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Education",
  "Restaurant",
  "Hotel & Hospitality",
  "NGO",
  "Construction",
  "Manufacturing",
  "Retail",
  "Agency",
  "Consulting",
  "Finance",
  "Real Estate",
  "Other",
] as const;

export const CURRENCIES = [
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
] as const;
