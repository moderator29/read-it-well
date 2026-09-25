import { intlTag, type Locale } from "@vallo/i18n/core";

/**
 * Money dates are days.
 *
 * V-24. The checkout printed `2026-10-16` and the cancellation sheet said "72
 * hours before check-in", which leaves somebody doing calendar arithmetic at
 * the most anxious moment of the transaction. Every date on a money screen is
 * therefore printed as a weekday, a day and a month, in Lagos time, with the
 * hour where the hour decides something: "Fri 16 Oct", "Wed 14 Oct, 3pm".
 * The escrow research already ruled that "releases on 7 October is a fact and
 * 21 days is arithmetic"; this is the same ruling applied to every money date.
 *
 * ONE HELPER, so no screen formats its own. A bare `YYYY-MM-DD` is a Lagos
 * calendar day and is read at noon Lagos time, so no timezone can tip it onto
 * the day before; anything with a time is an instant.
 *
 * The year is added only when the date is not in the current Lagos year,
 * because "Fri 16 Oct" is unambiguous in September and "Mon 4 Jan" is not.
 */

const LAGOS = "Africa/Lagos";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toInstant(value: Date | string): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const stamp = DATE_ONLY.test(value) ? `${value}T12:00:00+01:00` : value;
  const parsed = new Date(stamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function lagosYear(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS, year: "numeric" }).format(at);
}

/**
 * "Fri 16 Oct", or "Fri 16 Oct, 3pm" with `withTime`, or "Mon 4 Jan 2027"
 * across a year. Null for a value that is not a date, so a caller renders
 * nothing rather than "Invalid Date".
 */
export function formatMoneyDate(
  value: Date | string | null | undefined,
  locale: Locale = "en",
  options: { withTime?: boolean; now?: Date } = {},
): string | null {
  if (value === null || value === undefined) return null;
  const at = toInstant(value);
  if (!at) return null;
  const tag = intlTag[locale] ?? "en-NG";
  const sameYear = lagosYear(at) === lagosYear(options.now ?? new Date());

  const parts = new Intl.DateTimeFormat(tag, {
    timeZone: LAGOS,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).formatToParts(at);
  const piece = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  // Assembled rather than taken whole, because en-NG puts a comma after the
  // weekday ("Fri, 16 Oct") and the money screens read cleaner without it.
  // en-NG spells September "Sept" where every other month is three letters;
  // the house style is three letters throughout.
  const month = piece("month") === "Sept" ? "Sep" : piece("month");
  const day = [piece("weekday"), piece("day"), month, sameYear ? "" : piece("year")]
    .filter((segment) => segment.length > 0)
    .join(" ");

  if (!options.withTime) return day;
  return `${day}, ${formatMoneyTime(at, locale)}`;
}

/** "3pm", "10:30am": the hour as a Lagos clock shows it, minutes only when they exist. */
export function formatMoneyTime(at: Date, locale: Locale = "en"): string {
  const tag = intlTag[locale] ?? "en-NG";
  const parts = new Intl.DateTimeFormat(tag, {
    timeZone: LAGOS,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(at);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const period = (parts.find((part) => part.type === "dayPeriod")?.value ?? "").toLowerCase().replace(/\./g, "");
  return `${hour}${minute === "00" ? "" : `:${minute}`}${period}`;
}
