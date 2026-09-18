import { z } from "zod";

/**
 * What a tenant submits to open the rent payment step.
 *
 * Two facts and nothing else: which inspection, and the day they move in.
 * Every bound here has a twin inside `private.open_rent_charge`, which is the
 * real enforcement; this file adds the sentence a person reads. The move-in
 * day is optional and defaults to the inspection's own agreed day or today,
 * because the figure charged does not depend on it and a tenant should not be
 * refused a payment over a date picker.
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date in Lagos as an ISO string, comparable with `<`. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(now);
}

/** True when the string is a real calendar date, not merely date-shaped. */
function isRealDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/** How far ahead a move-in may be named. Beyond this the rent will have changed. */
export const MAX_MOVE_IN_DAYS_AHEAD = 120;

export const startRentPaymentSchema = z.object({
  inspectionId: z.uuid("This inspection could not be identified."),
  moveIn: z
    .string()
    .regex(ISO_DATE_RE, "Pick a move-in date.")
    .refine(isRealDate, "That move-in date does not exist. Pick it again.")
    .optional(),
});

export type StartRentPaymentInput = z.infer<typeof startRentPaymentSchema>;

/**
 * Is this a day somebody could actually move in? Split from the schema
 * because it needs the clock. Returns the message to show, or null.
 */
export function whyNotMoveIn(moveIn: string, today: string = lagosToday()): string | null {
  if (moveIn < today) return "The move-in date has passed. Pick today or later.";
  const days = Math.round(
    (Date.parse(`${moveIn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
  );
  if (days > MAX_MOVE_IN_DAYS_AHEAD) {
    return `A move-in can be named up to ${MAX_MOVE_IN_DAYS_AHEAD} days ahead.`;
  }
  return null;
}

export const rentPaymentIdSchema = z.object({
  inspectionId: z.uuid("This inspection could not be identified."),
});
