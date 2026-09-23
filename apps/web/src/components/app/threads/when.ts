import { formatDate, type Locale } from "@vallo/i18n";

/**
 * Times as the thread banner says them. Everything here is Lagos wall-clock,
 * because an inspection at "10:00" and a table at "8:00 pm" are appointments in
 * one city, whatever device is reading them.
 */

/** "Fri 26 Sep, 8:00 pm" from an ISO instant. Empty when the instant is unreadable. */
export function lagosWhen(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = formatDate(date, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
  const time = formatDate(date, locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });
  return `${day}, ${time}`;
}

/** "Fri 26 Sep" from an ISO date (YYYY-MM-DD) or instant. */
export function lagosDay(iso: string, locale: Locale): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00+01:00`) : new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
}

/** `{name}` style placeholders, the way the dictionary writes them. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
