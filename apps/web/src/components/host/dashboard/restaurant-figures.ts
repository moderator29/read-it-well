import { buildDesk, lagosDay, type DeskTable } from "@/app/host/reservations/desk";
import type { HostTableBoard } from "@/app/host/reservations/board";
import { addDays } from "@/lib/host/tape-chart";

/**
 * THE RESTAURANT HOME'S FIGURES, AS ARITHMETIC (track/hospitality-workspace).
 *
 * Pure. Today's covers, the tables to confirm and the tables seated come from
 * `buildDesk`, the same cut the table desk draws, so the home and the desk
 * can never disagree about tonight. What the desk does not carry are the two
 * counts that need a longer window than the board reads: the seven days
 * ahead and the no-shows this month. Those are read separately
 * (`restaurant-reads.ts`) as exact counts, and either is null when it could
 * not be read, never a zero nobody counted.
 *
 * A table counts toward a day's line when it is still booked or was kept: a
 * request waiting, a confirmed table or a seated one. A table the venue
 * declined, the guest cancelled or nobody showed up for is not a booking for
 * that day.
 */

export const WEEK_DAYS = 7;

/** A reservation, reduced to what the week's line counts. */
export type WeekRow = { reservedFor: string; status: string; partySize: number };

export type WeekPoint = { day: string; bookings: number; guests: number };

export type RestaurantFigures = {
  today: string;
  /** Guests at today's confirmed and seated tables. */
  coversExpected: number;
  coverTables: number;
  /** Requests still ahead and waiting for an answer, on any day. */
  toConfirm: number;
  /** Of those, today's. */
  toConfirmToday: number;
  seated: number;
  seatedGuests: number;
  /** Tables nobody came to this Lagos month; null when it could not be counted. */
  noShowsMonth: number | null;
  /** Today and the six days after it; null when it could not be read. */
  week: WeekPoint[] | null;
  /** Today's tables, soonest first. */
  todayTables: DeskTable[];
  /** Whether the board holds any table at all, today or ever. */
  hasTables: boolean;
};

const KEPT = new Set(["PENDING", "CONFIRMED", "COMPLETED"]);

export function buildWeek(rows: readonly WeekRow[], today: string): WeekPoint[] {
  const points: WeekPoint[] = Array.from({ length: WEEK_DAYS }, (_, i) => ({ day: addDays(today, i), bookings: 0, guests: 0 }));
  const at = new Map(points.map((p, i) => [p.day, i]));
  for (const row of rows) {
    if (!KEPT.has(row.status)) continue;
    const index = at.get(lagosDay(row.reservedFor));
    if (index === undefined) continue;
    points[index]!.bookings += 1;
    points[index]!.guests += row.partySize;
  }
  return points;
}

export function buildRestaurantFigures(input: {
  board: HostTableBoard;
  now: Date;
  week: readonly WeekRow[] | null;
  noShowsMonth: number | null;
}): RestaurantFigures {
  const desk = buildDesk(input.board, input.now);
  const f = desk.figures;
  return {
    today: desk.today,
    coversExpected: f.coversExpected,
    coverTables: f.coverTables,
    toConfirm: input.board.requests.length,
    toConfirmToday: f.toConfirm,
    seated: f.seated,
    seatedGuests: f.seatedGuests,
    noShowsMonth: input.noShowsMonth,
    week: input.week === null ? null : buildWeek(input.week, desk.today),
    todayTables: desk.todayTables,
    hasTables: input.board.total > 0,
  };
}

/** The first instant of the Lagos month a Lagos day falls in, as ISO. */
export function lagosMonthStart(today: string): string {
  return new Date(Date.parse(`${today.slice(0, 7)}-01T00:00:00+01:00`)).toISOString();
}

/** The first instant of a Lagos day, as ISO. */
export function lagosDayStart(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00+01:00`)).toISOString();
}
