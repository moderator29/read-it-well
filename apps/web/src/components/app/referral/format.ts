import { formatDate, formatMoney, type Locale } from "@vallo/i18n/core";

/**
 * Dates and money for the rewards screens, one way each. A day ("2026-10-06")
 * is read at noon in Lagos so no timezone can move it across midnight.
 */
export function dayLabel(day: string, locale: Locale): string {
  const date = new Date(`${day}T12:00:00+01:00`);
  return Number.isNaN(date.getTime())
    ? ""
    : formatDate(date, locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}

export function momentLabel(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : formatDate(date, locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

/** A month heading for the history ("October 2026"), and its key. */
export function monthOf(iso: string, locale: Locale): { key: string; label: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { key: "unknown", label: "" };
  const label = formatDate(date, locale, { month: "long", year: "numeric", timeZone: "Africa/Lagos" });
  return { key: label, label };
}

export function money(minor: number, locale: Locale): string {
  return formatMoney(minor, locale);
}
