import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, addHours } from "date-fns";

// ── Tailwind class merging ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Currency formatting ───────────────────────────────────────────────────────

// Symbols/prefixes for compact display. GCC currencies first; falls back to the
// ISO code for anything not listed.
const CURRENCY_SYMBOLS: Record<string, string> = {
  AED: "AED ",
  SAR: "SAR ",
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = "AED"
): string {
  const value = Number(amount ?? 0);
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyCompact(
  amount: number | string | null | undefined,
  currency = "AED"
): string {
  const value = Number(amount ?? 0);
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(1)}K`;
  return formatCurrency(value, currency);
}

// ── Date / time formatting ────────────────────────────────────────────────────

export function formatDate(
  date: Date | string | null | undefined,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMM yyyy");
}

export function formatDateTime(
  date: Date | string | null | undefined,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "d MMM yyyy, h:mm a");
}

export function formatTime(
  date: Date | string | null | undefined,
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "h:mm a");
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// ── Percentage / trend ────────────────────────────────────────────────────────

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTrend(
  current: number,
  previous: number
): { value: number; label: string; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { value: 0, label: "—", direction: "flat" };
  const change = ((current - previous) / previous) * 100;
  const direction = change > 0.5 ? "up" : change < -0.5 ? "down" : "flat";
  return {
    value: Math.abs(change),
    label: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
    direction,
  };
}

// ── String helpers ────────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}…`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function humanizeEnum(value: string): string {
  return value
    .split("_")
    .map((word) => capitalize(word))
    .join(" ");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

// ── Pagination ────────────────────────────────────────────────────────────────

export function getPaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

// ── URL / app ─────────────────────────────────────────────────────────────────

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// ── API response helpers ──────────────────────────────────────────────────────

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return Response.json(data, { status });
}
