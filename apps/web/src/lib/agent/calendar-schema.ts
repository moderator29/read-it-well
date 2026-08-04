/**
 * Agent calendar input and the shared date helpers.
 *
 * Client-safe: imports nothing server-only, so the calendar editor can use the
 * month maths without pulling a server module into the browser bundle.
 *
 * Every date is an ISO `YYYY-MM-DD` calendar date in Lagos, never a moment in
 * time, which is the same contract the bookings loop uses.
 */

import { z } from "zod";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/** The longest run of nights an agent can close in one action. */
export const MAX_BLOCK_NIGHTS = 180;

const isoDate = z
  .string({ message: "Pick a date." })
  .regex(ISO_DATE_RE, "Pick a date.")
  .refine(isIsoDate, "That date does not exist. Pick it again.");

export const blockNightsInputSchema = z
  .object({
    listingId: z.string().min(1, "This listing could not be identified."),
    from: isoDate,
    to: isoDate,
  })
  .superRefine((value, ctx) => {
    if (!isIsoDate(value.from) || !isIsoDate(value.to)) return;
    if (value.to < value.from) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: "The last night cannot be before the first.",
      });
      return;
    }
    if (countNights(value.from, value.to) > MAX_BLOCK_NIGHTS) {
      ctx.addIssue({
        code: "custom",
        path: ["to"],
        message: `Close up to ${MAX_BLOCK_NIGHTS} nights at a time.`,
      });
    }
  });

/** Inclusive night count between two ISO dates. */
export function countNights(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

/** Every ISO date from `from` to `to`, inclusive. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const start = Date.parse(`${from}T00:00:00Z`);
  const total = countNights(from, to);
  for (let i = 0; i < total; i += 1) {
    const d = new Date(start + i * 86_400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Today as an ISO calendar date in Lagos. */
export function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}

/**
 * The calendar grid for one month, padded to whole weeks starting Monday.
 * Null means a padding cell that belongs to a neighbouring month.
 */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  /* getUTCDay is 0 for Sunday; shift so Monday is 0. */
  const lead = (first.getUTCDay() + 6) % 7;

  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
