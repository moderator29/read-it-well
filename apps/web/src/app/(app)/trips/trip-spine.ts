/**
 * TRIPS, ON ONE SPINE.
 *
 * A person's Stays side holds two kinds of thing that both happen on a date:
 * a STAY, which runs from a check-in to a check-out, and a TABLE, which is a
 * moment. Kept in separate lists they read as two products; on one spine,
 * ordered by when they happen, they read as a diary, which is what they are.
 *
 * Research pitch 12: a vertical rule connects them chronologically and
 * tonight is accented. This module is the arithmetic behind that, kept pure
 * so the ordering, the grouping and "which one is tonight" are tested rather
 * than eyeballed on a screen that only shows one month.
 *
 * DATES ARE LAGOS DATES. A stay checks in on a calendar day, not at an
 * instant, and a table is booked for a wall-clock time in one city. Both are
 * compared as `YYYY-MM-DD` strings on the Lagos calendar, which sorts
 * correctly as text and cannot drift by a timezone on a diaspora phone.
 */

export type TripKind = "stay" | "table";

export type TripEntry = {
  id: string;
  kind: TripKind;
  /** The Lagos calendar day this entry happens on. `YYYY-MM-DD`. */
  on: string;
  /** ISO instant for a table, so two tables on one day sort by the hour. */
  at?: string;
  /** Terminal states sit in the past whatever their date says. */
  cancelled: boolean;
};

export type TripSpine<T extends TripEntry> = {
  /** Today and after, soonest first. The spine proper. */
  upcoming: T[];
  /** Before today, or cancelled: most recent first, behind a disclosure. */
  past: T[];
  /** Ids happening today. Accented, and there can be more than one. */
  tonight: string[];
};

function sortKey(entry: TripEntry): string {
  return entry.at ?? `${entry.on}T00:00:00.000Z`;
}

/**
 * Split and order a person's trips around today.
 *
 * A CANCELLED trip is past even when its date is ahead, because it is a
 * record rather than a plan, and leaving it on the upcoming spine would put a
 * thing that is not happening between two things that are.
 */
export function buildTripSpine<T extends TripEntry>(entries: T[], today: string): TripSpine<T> {
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const entry of entries) {
    if (entry.cancelled || entry.on < today) past.push(entry);
    else upcoming.push(entry);
  }

  upcoming.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  past.sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

  return {
    upcoming,
    past,
    tonight: upcoming.filter((entry) => entry.on === today).map((entry) => entry.id),
  };
}

/** Today in Lagos as `YYYY-MM-DD`, which is the calendar every trip sits on. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
