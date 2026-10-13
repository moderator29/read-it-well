import { formatDate, type Locale } from "@vallo/i18n/core";

/** `{name}` placeholders filled from a dictionary sentence. */
export function fillWords(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** A Lagos calendar day (`YYYY-MM-DD`) in words, the same from the server and every phone. */
export function dayLabel(day: string, locale: Locale, withYear = false): string {
  /* Noon UTC: no zone can move the date. */
  return formatDate(new Date(`${day}T12:00:00Z`), locale, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** A booked slot in words: weekday, day, month and the Lagos time. */
export function slotLabel(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
