import { formatDate, formatMoney, type Locale } from "@vallo/i18n/core";
import type { TermChange } from "@/lib/agreements/terms-diff";

/**
 * M2: an agreement's terms and moments, in words. One place, so the terms
 * sheet, the "what changed" card, the version diff and the history all say a
 * day, a figure and a time the same way. Client-safe and pure.
 */

/** A terms date (`YYYY-MM-DD`, a Lagos calendar day) in words; anything else as it is. */
export function termDay(value: string | null, locale: Locale): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatDate(new Date(`${value}T12:00:00+01:00`), locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** One side of a changed line, in words: money, a day, or the text itself. */
export function termValue(c: TermChange, v: TermChange["before"], locale: Locale, notStated: string): string {
  if (v === null) return notStated;
  if (c.kind === "money" && typeof v === "number") return formatMoney(v, locale);
  if (c.kind === "date" && typeof v === "string") return termDay(v, locale) ?? v;
  return String(v);
}

/** A recorded moment (an event's instant) as a short Lagos date and time. */
export function momentLabel(iso: string, locale: Locale): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return formatDate(at, locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** A recorded moment as a day only. */
export function dayLabel(iso: string, locale: Locale): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return formatDate(at, locale);
}
