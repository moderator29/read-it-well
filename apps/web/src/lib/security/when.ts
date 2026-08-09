/**
 * When a session started, and when it was last used.
 *
 * Deliberately not the feed's `whenLabel`. A feed compresses to "2d" because
 * the exact hour of a post does not change what anybody does next. This screen
 * is where somebody decides whether a sign-in was them, and "2d" cannot answer
 * that: the useful question is "was I signed in on Thursday afternoon", so
 * anything past yesterday keeps its date and its time.
 *
 * ## It returns a shape, not a sentence
 *
 * Four of the five branches need a word in the reader's language, and this
 * module has no dictionary and should not acquire one: a pure function with a
 * `now` argument is testable at every boundary, and one that also had to be
 * handed a Dictionary would be tested through it. So the caller gets a kind and
 * a rendered clock time, and joins them with copy from `settings.devices`.
 *
 * Africa/Lagos, always, on both server and client. This product has one market
 * and the reader is in it, and a session list that renders one time on the
 * server and a different one after hydration is a screen somebody stops
 * trusting on exactly the day they most need to.
 */

const LAGOS = "Africa/Lagos";

/** Roughly a day, for deciding whether the date is worth spelling out. */
const DAY_MS = 86_400_000;

export type SessionWhen =
  /** Unusable timestamp. The caller draws nothing rather than "Invalid Date". */
  | { kind: "unknown" }
  | { kind: "now" }
  | { kind: "minutes"; minutes: number }
  /** `time` is a 24 hour clock reading in Lagos. */
  | { kind: "today"; time: string }
  | { kind: "yesterday"; time: string }
  /** Already a complete phrase: a date, and a time unless it is over a year. */
  | { kind: "date"; date: string };

function lagos(iso: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: LAGOS }).format(new Date(iso));
}

const CLOCK: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };

/**
 * The calendar day something happened on, in Lagos, as `YYYY-MM-DD`.
 *
 * "Today" and "yesterday" are calendar words and not durations, and an earlier
 * version of this file treated them as durations: under twenty-four hours old
 * was "today". A test caught it at 20:15 the previous evening, eighteen hours
 * before a mid-afternoon read, which that version called today. Somebody
 * checking whether a sign-in was theirs would have been told a session started
 * this afternoon when it started last night, which is precisely the confident
 * false sentence this screen must never produce.
 *
 * `en-CA` because it is the locale that formats a date as `YYYY-MM-DD`, which
 * sorts and subtracts. The locale is a formatting trick and carries no meaning.
 */
function lagosDay(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

/** Whole days between two `YYYY-MM-DD` strings. Both are read as UTC midnight. */
function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / DAY_MS);
}

/**
 * Never throws, and that is not tidiness.
 *
 * `Intl.DateTimeFormat.format` raises RangeError on an invalid date, and this
 * runs inside a map inside a server component. One unparseable row would take
 * down the whole screen, and the screen it would take down is the one somebody
 * opens when they think their account has been taken.
 *
 * `now` is injectable so every branch can be tested without waiting a week.
 */
export function sessionWhen(iso: string | null | undefined, now: number = Date.now()): SessionWhen {
  if (typeof iso !== "string" || iso.length === 0) return { kind: "unknown" };
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return { kind: "unknown" };

  const elapsed = now - then;

  /* A clock ahead of the server, or a row written a moment ago, both land
     slightly in the future. Reading that back as a date next week is worse
     than reading it as now, and neither is worth a branch of its own. */
  if (elapsed < 60_000) return { kind: "now" };

  try {
    if (elapsed < 3_600_000) return { kind: "minutes", minutes: Math.floor(elapsed / 60_000) };

    /* Calendar days, not elapsed hours. See `lagosDay` for the bug this shape
       exists to prevent and the test that found it. */
    const days = daysBetween(lagosDay(new Date(then)), lagosDay(new Date(now)));
    if (days <= 0) return { kind: "today", time: lagos(iso, CLOCK) };
    if (days === 1) return { kind: "yesterday", time: lagos(iso, CLOCK) };

    /*
     * Past yesterday the day of the week stops helping and the date starts. The
     * year appears beyond a year and the clock time drops with it: a session
     * that has been alive that long is the most interesting row on the screen,
     * and the minute it started in is not what makes it interesting.
     */
    const options: Intl.DateTimeFormatOptions =
      days > 365
        ? { day: "numeric", month: "short", year: "numeric" }
        : { day: "numeric", month: "short", ...CLOCK };
    return { kind: "date", date: lagos(iso, options) };
  } catch {
    return { kind: "unknown" };
  }
}
