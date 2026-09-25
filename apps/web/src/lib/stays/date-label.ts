import type { Locale } from "@vallo/i18n/core";

/**
 * "Sat 10 Oct" for an ISO calendar date, the way the stay page shows it.
 * UX-28: shared so the checkout says the same dates the same way, instead of
 * printing "2026-10-10" after the stay page said "Sat 10 Oct".
 */
export function stayDateLabel(iso: string | undefined, locale: Locale): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}
