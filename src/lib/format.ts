// Formatting helpers. Timestamps are stored UTC and displayed in local time (rule 10).

export function fmtDate(d: Date | string | null | undefined, locale = "en"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function fmtDateTime(d: Date | string | null | undefined, locale = "en"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function fmtMoney(
  value: number | string | null | undefined,
  currency: string | null | undefined
): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400_000);
}

/** yyyy-mm-dd for <input type="date"> defaults. */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function fmtPercent(v: number | string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return `${n}%`;
}
