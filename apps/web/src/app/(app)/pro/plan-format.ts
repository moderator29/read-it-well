import { formatMoney, intlTag, type Locale } from "@vallo/i18n/core";

/**
 * Dates and amounts on /pro, from the rows only. A long date in Lagos time (a
 * fixed instant formatted in a fixed zone reads the same on the server and in
 * the browser), and an amount from integer kobo. An unreadable date is empty,
 * never a guess.
 */
export function longDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Intl.DateTimeFormat(intlTag[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(ms));
}

export function money(minor: number, locale: Locale): string {
  return formatMoney(minor, locale);
}

/** Fill `{name}` slots; a slot with no value is left out rather than printed raw. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}
