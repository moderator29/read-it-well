import { formatDate, type Locale } from "@vallo/i18n/core";
import { lagosNoon } from "@/lib/inspections/visit";

/**
 * Every date and time the visit screens print, on Lagos time and in the
 * reader's locale. A renter abroad reads the lister's clock, and the screens
 * say so once ("Times are Lagos time").
 */

const ZONE = "Africa/Lagos";

/** "Thu" for a `YYYY-MM-DD` day. */
export function weekdayShort(day: string, locale: Locale): string {
  return formatDate(lagosNoon(day), locale, { weekday: "short", timeZone: ZONE });
}

/** "15" for a `YYYY-MM-DD` day. */
export function dayNumber(day: string, locale: Locale): string {
  return formatDate(lagosNoon(day), locale, { day: "numeric", timeZone: ZONE });
}

/** "Thursday 15 October" for a `YYYY-MM-DD` day. */
export function dayLong(day: string, locale: Locale): string {
  return formatDate(lagosNoon(day), locale, { weekday: "long", day: "numeric", month: "long", timeZone: ZONE });
}

/** "October 2026" for a `YYYY-MM` month. */
export function monthLabel(month: string, locale: Locale): string {
  return formatDate(lagosNoon(`${month}-15`), locale, { month: "long", year: "numeric", timeZone: ZONE });
}

/** The single-letter-ish weekday headers, Monday first. */
export function weekdayHeaders(locale: Locale): string[] {
  /* 5 to 11 October 2026 is a Monday to a Sunday. */
  return Array.from({ length: 7 }, (_, i) => formatDate(lagosNoon(`2026-10-${String(5 + i).padStart(2, "0")}`), locale, { weekday: "narrow", timeZone: ZONE }));
}

/** "10:00" for an instant. */
export function timeOf(at: string, locale: Locale): string {
  return formatDate(new Date(at), locale, { hour: "2-digit", minute: "2-digit", timeZone: ZONE });
}

/** "Thu 15 Oct 2026" for an instant. */
export function dateOf(at: string, locale: Locale): string {
  return formatDate(new Date(at), locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: ZONE });
}

/** "15 Oct, 10:00" for an instant: the timeline's stamp. */
export function stampOf(at: string, locale: Locale): string {
  return formatDate(new Date(at), locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: ZONE });
}
