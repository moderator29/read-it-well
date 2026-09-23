/**
 * How old a listing is, said the way a person would say it (V-22).
 *
 * WHY THE AGE IS ON EVERY CARD. Stale flats are the defining complaint of the
 * Nigerian rental market: the flat on the WhatsApp broadcast was let in March
 * and is still being advertised in August. Portals show an "added" date that a
 * paid push-up refreshes, so theirs means nothing. Vallo sells no placement
 * (V-06), so `published_at` is a real date nobody can buy a new copy of, and
 * printing it is the cheapest honest defence against a stale listing.
 *
 * THE SIXTY DAY RULE. Past sixty days the age stops reading as fresh news and
 * becomes a question: has anybody said the flat is still free? Until the owner
 * heartbeat exists (V-31) nobody has, and the line says exactly that: "Listed
 * in July, not confirmed since". It is a statement about what the platform
 * knows, which is true, and never a claim that the flat is gone.
 *
 * DAYS ARE LAGOS DAYS. A listing published at 23:30 in Lagos was published
 * "today" in Lagos, even though it is tomorrow in UTC. Africa/Lagos is UTC+1
 * all year (no daylight saving), so the offset is a constant rather than a
 * timezone database lookup.
 *
 * AN EXAMPLE LISTING HAS NO AGE. It illustrates a flat that does not exist, so
 * "Listed 3 days ago" would be a sentence about the world that is false. The
 * caller decides that (it holds `isDemo`); this module only does the arithmetic.
 *
 * Pure: `now` is an argument, so the whole rule is tested with fixed clocks.
 */

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Past this many days, the age asks to be confirmed. */
export const STALE_AFTER_DAYS = 60;

export type ListedAge =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "days"; days: number }
  | { kind: "stale"; since: Date };

/** The Lagos calendar day a moment falls on, as a day number. */
function lagosDay(at: Date): number {
  return Math.floor((at.getTime() + LAGOS_OFFSET_MS) / DAY_MS);
}

/** Whole Lagos days between two moments; never negative. */
export function lagosDaysBetween(from: Date, to: Date): number {
  return Math.max(0, lagosDay(to) - lagosDay(from));
}

/**
 * The age of a listing, or null when there is no honest answer: no date, a
 * date that does not parse, or a date in the future (a clock that disagrees
 * with ours is not a listing from tomorrow).
 */
export function listedAge(publishedAt: string | null | undefined, now: Date): ListedAge | null {
  if (!publishedAt) return null;
  const at = new Date(publishedAt);
  if (Number.isNaN(at.getTime())) return null;
  if (at.getTime() - now.getTime() > 5 * 60 * 1000) return null;
  const days = lagosDaysBetween(at, now);
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "yesterday" };
  if (days > STALE_AFTER_DAYS) return { kind: "stale", since: at };
  return { kind: "days", days };
}

/** Whether a listing was published after the reader's last visit. */
export function isNewSince(
  publishedAt: string | null | undefined,
  lastVisit: number | null,
): boolean {
  if (!publishedAt || lastVisit === null) return false;
  const at = new Date(publishedAt).getTime();
  return Number.isFinite(at) && at > lastVisit;
}

export type ListedAgeCopy = {
  today: string;
  yesterday: string;
  days: string;
  stale: string;
};

/**
 * The words. `stale` carries `{month}`, which the caller fills with a month
 * name in the reader's locale (`formatDate` with `{ month: "long" }`, plus the
 * year when it is not this year).
 */
export function listedAgeText(age: ListedAge, copy: ListedAgeCopy, month: string): string {
  switch (age.kind) {
    case "today":
      return copy.today;
    case "yesterday":
      return copy.yesterday;
    case "days":
      return copy.days.replace("{n}", String(age.days));
    default:
      return copy.stale.replace("{month}", month);
  }
}

/** The month a stale listing was published in, with the year only when it differs. */
export function staleMonthOptions(since: Date, now: Date): Intl.DateTimeFormatOptions {
  const sameYear =
    new Date(since.getTime() + LAGOS_OFFSET_MS).getUTCFullYear() ===
    new Date(now.getTime() + LAGOS_OFFSET_MS).getUTCFullYear();
  return sameYear
    ? { month: "long", timeZone: "Africa/Lagos" }
    : { month: "long", year: "numeric", timeZone: "Africa/Lagos" };
}
