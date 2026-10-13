import { formatDate, type Locale } from "@vallo/i18n/core";

/**
 * DAY DIVIDERS, ON LAGOS TIME, FROM A CLOCK THE SERVER READ.
 *
 * A thread and the notification centre both break their rows by day. The day a
 * row belongs to is the Lagos calendar day of its instant (the same rule
 * `lib/messages/time.ts` uses), and "Today" and "Yesterday" are decided against
 * a `nowMs` the server page read once, never `Date.now()` inside render: a
 * client that hydrated a minute after midnight would otherwise disagree with
 * the markup it was handed. With no `nowMs` (a harness), nothing is "today",
 * and every divider is a plain date, which is true either way.
 *
 * Pure: no React, no reads.
 */

const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" });

/** `YYYY-MM-DD` in Lagos, or null for an unreadable instant. */
export function dayKeyOf(iso: string): string | null {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : DAY_KEY.format(at);
}

export type DayWords = { today: string; yesterday: string };

/** "Today", "Yesterday" or "Fri 26 Sep" (with the year once it is not this one). */
export function dayHeading(iso: string, locale: Locale, words: DayWords, nowMs?: number): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const key = DAY_KEY.format(at);
  if (nowMs !== undefined) {
    if (key === DAY_KEY.format(new Date(nowMs))) return words.today;
    if (key === DAY_KEY.format(new Date(nowMs - 86_400_000))) return words.yesterday;
  }
  const sameYear = nowMs === undefined || DAY_KEY.format(at).slice(0, 4) === DAY_KEY.format(new Date(nowMs)).slice(0, 4);
  return formatDate(at, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "Africa/Lagos",
  });
}

/**
 * Where a day divider goes in a list ordered oldest or newest first: the index
 * of every row whose Lagos day differs from the row before it (and row zero).
 * Rows with an unreadable instant never start a day.
 */
export function dayStarts<T extends { createdAt?: string | null }>(rows: readonly T[]): Set<number> {
  const out = new Set<number>();
  let last: string | null = null;
  rows.forEach((row, index) => {
    const key = row.createdAt ? dayKeyOf(row.createdAt) : null;
    if (key === null) return;
    if (key !== last) out.add(index);
    last = key;
  });
  return out;
}
