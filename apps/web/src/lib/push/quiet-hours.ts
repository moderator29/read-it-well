/**
 * QUIET HOURS, AND THE PLATFORM IS NIGERIAN.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR RULES, WHICH ARE NOT NEGOTIABLE AND ARE NOT ALL OBVIOUS.
 *
 * 1. QUIET HOURS APPLY TO PUSH AND TO NOTHING ELSE. They never delay an
 *    email, because an email already waits in an inbox and delaying it only
 *    makes it later. They never suppress the in-app row, because that row is
 *    the record of what happened and a record with holes in it at night is
 *    not a record. Only the thing that lights a screen at 3am is held.
 *
 * 2. THE ZONE IS STORED, NEVER INFERRED. It defaults to `Africa/Lagos` and
 *    the window is evaluated there, not in UTC and not in whatever zone the
 *    handset currently reports. UTC would be the easy mistake and it is the
 *    wrong one twice over: an evening in Lagos is late afternoon in UTC, so a
 *    22:00 to 07:00 window written in UTC would start an hour late and end an
 *    hour late, every night, for everybody. And reading the device's zone
 *    would wake somebody at what is genuinely night where they are standing
 *    the first time they travel.
 *
 *    WAT IS UTC+1 ALL YEAR AND NIGERIA HAS NO DAYLIGHT SAVING. That makes the
 *    arithmetic below trivially correct for the only zone that matters today.
 *    It is still written the general way, through the runtime's own zone
 *    database, because the moment somebody sets a zone that does observe a
 *    change, a hardcoded +1 becomes a silent hour of error twice a year and
 *    nobody would connect it to this file.
 *
 * 3. MONEY AND SECURITY GO STRAIGHT THROUGH, AT ANY HOUR. A reversed
 *    transaction or a failed withdrawal is not something a person would
 *    thank us for holding until seven. The database already makes exactly
 *    this argument for keeping wallet notifications unmutable in app
 *    (`20260804134543_...sql:17-22`); this extends it to push rather than
 *    inventing a second, different answer.
 *
 * 4. A HELD BACKLOG IS COLLAPSED, NOT REPLAYED. Eleven things that happened
 *    overnight are one notification at seven in the morning, not eleven. The
 *    collapsing itself lives in `collapse.ts`; what lives here is the instant
 *    the window opens, which is what everything held is waiting for.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A PURE MODULE AND NOT A DATABASE FUNCTION.
 *
 * The queue's trigger deliberately decides nothing about quiet hours. Policy
 * that lives in a migration can only be changed by another migration, and
 * this policy will be argued about. Here it is a pure function of an instant,
 * a window and a zone, with tests that pin the awkward cases: a window that
 * wraps past midnight, an instant exactly on the boundary, a malformed time
 * written by an older client, and a zone the runtime has never heard of.
 */

/** The four topics a quiet window is stored against, plus where it came from. */
export type QuietHours = {
  enabled: boolean;
  /** "HH:MM", 24 hour, in `timezone`. */
  from: string;
  /** "HH:MM", 24 hour, in `timezone`. */
  to: string;
  /** An IANA zone name. */
  timezone: string;
};

/**
 * What a person gets when they have never touched the setting.
 *
 * Quiet hours are OFF by default and that is deliberate. A default that
 * silently withholds notifications is a product that looks broken to the
 * person who just turned push on and then did not hear from it. The setting
 * is offered; it is not assumed.
 */
export const QUIET_HOURS_DEFAULT: QuietHours = {
  enabled: false,
  from: "22:00",
  to: "07:00",
  timezone: "Africa/Lagos",
};

/** The zone this platform is in. Used whenever a stored zone is missing or unusable. */
export const PLATFORM_TIMEZONE = "Africa/Lagos";

/** A verdict about one push at one instant. */
export type QuietVerdict =
  /** Send it now. */
  | { held: false }
  /** Hold it until this instant, when the window opens. */
  | { held: true; until: Date };

/**
 * Minutes past local midnight, or null when the string is not a time.
 *
 * Null rather than a throw, and null means "no window", because
 * `profiles.settings` is jsonb and can hold whatever an older client wrote.
 * The failure direction for a notification is to deliver it: the same rule
 * `private.notify` states for a malformed boolean.
 */
export function parseClock(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^([0-9]{1,2}):([0-9]{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * The offset of a zone at an instant, in minutes east of UTC.
 *
 * Read from the runtime's own zone database rather than assumed, for the
 * reason in rule 2. The trick is the standard one: format the instant in the
 * target zone, read the wall clock back, and treat that wall clock as though
 * it were UTC. The difference is the offset.
 *
 * Returns null for a zone the runtime does not know, so the caller can fall
 * back rather than silently compute in UTC.
 */
export function zoneOffsetMinutes(timeZone: string, at: Date): number | null {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(at);
  } catch {
    return null;
  }

  const read = (type: string): number => {
    const found = parts.find((part) => part.type === type);
    return found ? Number(found.value) : Number.NaN;
  };

  const year = read("year");
  const month = read("month");
  const day = read("day");
  /* `hour12: false` yields 24 in some runtimes where others yield 0. Both
     mean midnight, and the modulo is what makes this agree with itself
     across Node versions rather than being an hour out one day in a
     thousand. */
  const hour = read("hour") % 24;
  const minute = read("minute");
  const second = read("second");

  if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
    return null;
  }

  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  /* Seconds are dropped from the instant so the difference is a whole number
     of minutes rather than carrying the instant's own sub-minute remainder. */
  const actual = Math.floor(at.getTime() / 1000) * 1000;
  return Math.round((asIfUtc - actual) / 60_000);
}

/** The local wall clock in a zone, as minutes past midnight, or null. */
export function localMinutes(timeZone: string, at: Date): number | null {
  const offset = zoneOffsetMinutes(timeZone, at);
  if (offset === null) return null;
  const shifted = new Date(at.getTime() + offset * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/**
 * The instant at which a given local wall clock next occurs in a zone,
 * at or after `notBefore`.
 *
 * Converting a wall clock back to an instant means solving for an offset that
 * depends on the answer, so it is done by one guess and one correction, which
 * is exact for every real zone: the offset at the guessed instant is used to
 * place the second guess, and the offset there is the one that applies.
 */
export function nextLocalTime(timeZone: string, minutesPastMidnight: number, notBefore: Date): Date | null {
  const offset = zoneOffsetMinutes(timeZone, notBefore);
  if (offset === null) return null;

  /* The local calendar day `notBefore` falls on. */
  const local = new Date(notBefore.getTime() + offset * 60_000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();

  for (const dayOffset of [0, 1, 2]) {
    const wallUtc = Date.UTC(year, month, day + dayOffset, 0, 0, 0) + minutesPastMidnight * 60_000;

    /* One guess, then one correction. */
    const guessOffset = zoneOffsetMinutes(timeZone, new Date(wallUtc - offset * 60_000));
    const useOffset = guessOffset ?? offset;
    const instant = new Date(wallUtc - useOffset * 60_000);

    if (instant.getTime() >= notBefore.getTime()) return instant;
  }
  return null;
}

/**
 * Is this instant inside the window, and if so when does the window open?
 *
 * `urgent` short circuits the whole thing, for rule 3.
 *
 * A window whose ends are equal is treated as no window at all rather than as
 * twenty-four hours of silence. Somebody who sets both to 22:00 has made a
 * mistake, and the failure direction for a notification is to deliver it.
 */
export function quietVerdict(input: {
  quiet: QuietHours;
  at: Date;
  urgent: boolean;
}): QuietVerdict {
  const { quiet, at, urgent } = input;

  if (urgent) return { held: false };
  if (!quiet.enabled) return { held: false };

  const from = parseClock(quiet.from);
  const to = parseClock(quiet.to);
  if (from === null || to === null) return { held: false };
  if (from === to) return { held: false };

  /* An unknown zone falls back to the platform's own rather than to UTC,
     because UTC is the wrong answer by a whole hour for every person this
     product has. */
  const zone = quiet.timezone && quiet.timezone.length > 0 ? quiet.timezone : PLATFORM_TIMEZONE;
  let now = localMinutes(zone, at);
  let resolvedZone = zone;
  if (now === null) {
    now = localMinutes(PLATFORM_TIMEZONE, at);
    resolvedZone = PLATFORM_TIMEZONE;
  }
  if (now === null) return { held: false };

  /* A window that wraps past midnight (22:00 to 07:00) is inside when the
     clock is after the start OR before the end. One that does not wrap
     (01:00 to 06:00) is inside when it is after the start AND before the end.
     Getting this backwards is the classic defect in quiet hours and it is
     why both directions are pinned by tests. */
  const wraps = from > to;
  const inside = wraps ? now >= from || now < to : now >= from && now < to;

  if (!inside) return { held: false };

  const until = nextLocalTime(resolvedZone, to, at);
  if (!until) return { held: false };
  return { held: true, until };
}

/**
 * Read a quiet hours document out of whatever `profiles.settings` holds.
 *
 * Every field is checked one at a time. The document is jsonb written by
 * several versions of a client and a single bad cast here would, inside the
 * drain, hold or release every notification on the platform.
 */
export function readQuietHours(settings: unknown): QuietHours {
  const notifications = pick(pick(settings, "notifications"), "quiet_hours");
  if (!notifications || typeof notifications !== "object") return QUIET_HOURS_DEFAULT;

  const raw = notifications as Record<string, unknown>;
  const from = parseClock(raw.from) === null ? QUIET_HOURS_DEFAULT.from : String(raw.from);
  const to = parseClock(raw.to) === null ? QUIET_HOURS_DEFAULT.to : String(raw.to);
  const timezone =
    typeof raw.timezone === "string" && raw.timezone.trim().length > 0
      ? raw.timezone.trim()
      : PLATFORM_TIMEZONE;

  return {
    enabled: raw.enabled === true,
    from,
    to,
    timezone,
  };
}

function pick(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value as Record<string, unknown>)[key];
}
