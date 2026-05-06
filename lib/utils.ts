import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE).format(date);
}

export function formatDateLong(value: string | Date | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatNumber(value: number | string | null | undefined) {
  const normalized = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(normalized);
}

export function formatCurrency(value: number | string | null | undefined) {
  const normalized = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits: 2,
  }).format(normalized);
}

export function toInputDate(value?: string | null) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function toNumber(value: FormDataEntryValue | string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value == null) {
    return 0;
  }

  const normalized = Number(String(value).replace(",", "."));
  return Number.isFinite(normalized) ? normalized : 0;
}

export function parseInteger(value: FormDataEntryValue | string | number | null | undefined) {
  return Math.trunc(toNumber(value));
}

export function nullableId(value: FormDataEntryValue | string | number | null | undefined) {
  const parsed = parseInteger(value);
  return parsed > 0 ? parsed : null;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function listDaysInMonth(month: string) {
  const [year, monthPart] = month.split("-").map(Number);
  const totalDays = new Date(year, monthPart, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${String(monthPart).padStart(2, "0")}-${day}`;
  });
}

export function safeJsonParse<T>(value: string, fallback: T) {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function slugifyFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
