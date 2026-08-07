import { z } from "zod";

/**
 * What a guest is allowed to ask a restaurant for.
 *
 * Every bound here has a twin in the database, and that is deliberate rather
 * than redundant. The check constraints and the trigger on public.reservations
 * are the real enforcement, because a server action is one caller among several
 * and a rule that lives only in a form holds until the second caller exists.
 * What this file adds is the SENTENCE: Postgres refuses a party of sixty with
 * "violates check constraint", and nobody should ever read that.
 *
 * The time is handled as a local wall clock rather than an instant, because
 * that is how a person books dinner. Somebody choosing "Friday, 7pm" means
 * seven in the evening where the restaurant is, which is Lagos, whatever their
 * phone believes about its own timezone.
 */

/** Above this a table is an event, and the answer is a conversation. */
export const MAX_PARTY = 50;

/** How far ahead a table may be held. Beyond this nobody knows their plans. */
export const MAX_DAYS_AHEAD = 90;

/**
 * Nigeria does not observe daylight saving and never has, so West Africa Time
 * is a fixed +01:00 all year. That is what makes this safe to write as a
 * literal: a fixed offset cannot drift the way a rule-based zone can, and the
 * alternative, building a Date from browser-local parts, silently books a table
 * an hour out for anybody whose device is set to another country.
 */
const LAGOS_OFFSET = "+01:00";

/**
 * A date and a time in Lagos, as the instant they name.
 *
 * Returns null for anything that is not a real moment, including the shapes a
 * hand-edited form field can produce. Callers treat null as "not a time",
 * never as "now".
 */
export function lagosInstant(date: string, time: string): Date | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!day || !clock) return null;

  const year = Number(day[1]);
  const month = Number(day[2]);
  const dayOfMonth = Number(day[3]);
  const hour = Number(clock[1]);
  const minute = Number(clock[2]);
  if (month < 1 || month > 12 || dayOfMonth < 1 || dayOfMonth > 31) return null;
  if (hour > 23 || minute > 59) return null;

  /* Reject the dates that parse but do not exist. `new Date("2026-02-31")` is
     accepted and silently becomes the third of March, which would confirm a
     table on a day the guest never picked. Building the same parts through
     Date.UTC and reading them back is what catches it: February 31 comes back
     as March 3 and the components no longer match. */
  const probe = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() + 1 !== month ||
    probe.getUTCDate() !== dayOfMonth
  ) {
    return null;
  }

  const at = new Date(`${date}T${time}:00${LAGOS_OFFSET}`);
  return Number.isNaN(at.getTime()) ? null : at;
}

export const reserveSchema = z.object({
  listingId: z.string().uuid({ message: "That restaurant could not be identified." }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Pick a date." }),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Pick a time." }),
  partySize: z.coerce
    .number()
    .int({ message: "Guests must be a whole number." })
    .min(1, { message: "A table is for at least one person." })
    .max(MAX_PARTY, {
      message: `For more than ${MAX_PARTY} people, message the restaurant instead.`,
    }),
  note: z
    .string()
    .max(500, { message: "Keep the note under 500 characters." })
    .optional()
    .or(z.literal("")),
});

export type ReserveInput = z.infer<typeof reserveSchema>;

export const respondSchema = z.object({
  reservationId: z.string().uuid(),
  decision: z.enum(["CONFIRMED", "CANCELLED"]),
});

/**
 * Is this a moment somebody could actually turn up for?
 *
 * Split out from the Zod schema because it needs the clock, and a schema that
 * reads the clock cannot be reasoned about or tested. Returns the message to
 * show, or null when the time is fine.
 */
export function whyNotBookable(at: Date, now: Date = new Date()): string | null {
  if (at.getTime() <= now.getTime()) {
    return "That time has already passed. Pick a later one.";
  }
  const days = (at.getTime() - now.getTime()) / 86_400_000;
  if (days > MAX_DAYS_AHEAD) {
    return `Tables can be held up to ${MAX_DAYS_AHEAD} days ahead.`;
  }
  return null;
}
