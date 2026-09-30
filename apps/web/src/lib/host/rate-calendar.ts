/**
 * THE HOST'S RATE CALENDAR, AS PURE DATA (C1, 30 September 2026).
 *
 * WHAT THE CALENDAR IS A WINDOW ON. Two tables already decide what a night
 * costs and whether it can be sold, and the database prices from both:
 *
 *   rate_calendar   one row per rate plan per night: a different price
 *                   (`rate_minor`, null means "the plan's own rate") or a
 *                   closed night (`closed`). `private.price_room_booking`
 *                   sums `coalesce(rc.rate_minor, rp.rate_minor)` over the
 *                   nights and refuses a stay that crosses a closed night;
 *                   `stays_search` does the same sum for a dated search.
 *   room_inventory  one row per room type per night: how many are on sale
 *                   (`units_open`) and how many are held (`units_booked`,
 *                   written only by the booking trigger).
 *
 * This file prices NOTHING. It lays those rows out as a month, says which
 * nights differ from the plan's own rate, and turns a host's selection into
 * the list of dates the one server action writes. The effective price shown
 * on a cell is `override ?? base`, which is the same coalesce the database
 * does, so the grid can never quote a night differently from the checkout.
 *
 * Dates are ISO `YYYY-MM-DD` and all arithmetic is UTC, for the reason
 * `lib/stays/inventory.ts` gives: a local midnight in Lagos renders as the
 * previous day in ISO, and that is how a calendar loses its first night.
 */

/** The most nights one act may write, so nothing is lost part way. */
export const MAX_CALENDAR_NIGHTS = 186;

/** How far ahead a host may set a price: the inventory horizon plus a margin. */
export const CALENDAR_HORIZON_MONTHS = 18;

export type IsoDate = string;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO.test(value)) return false;
  const at = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value;
}

function utc(date: IsoDate): number {
  return Date.parse(`${date}T00:00:00Z`);
}

function iso(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return iso(utc(date) + days * 86_400_000);
}

/** Today in Lagos (UTC+1, no daylight saving), which is the day the database means. */
export function lagosToday(now: Date = new Date()): IsoDate {
  return iso(now.getTime() + 3_600_000);
}

/** "2026-10" from a date or a month string; null for anything else. */
export function parseMonth(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (MONTH.test(trimmed)) return trimmed;
  if (isIsoDate(trimmed)) return trimmed.slice(0, 7);
  return null;
}

export function monthOf(date: IsoDate): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  const mm = (index % 12) + 1;
  return `${year}-${String(mm).padStart(2, "0")}`;
}

export function firstOfMonth(month: string): IsoDate {
  return `${month}-01`;
}

export function lastOfMonth(month: string): IsoDate {
  return addDays(firstOfMonth(addMonths(month, 1)), -1);
}

/** Every night of a month, in order. */
export function nightsOfMonth(month: string): IsoDate[] {
  return rangeInclusive(firstOfMonth(month), lastOfMonth(month));
}

/** The weekday of a date, Monday = 0 through Sunday = 6. */
export function weekdayMon0(date: IsoDate): number {
  return (new Date(utc(date)).getUTCDay() + 6) % 7;
}

/**
 * The grid for a month: whole weeks, Monday first, so the week a Nigerian
 * hotel prices by (a weekend is Friday and Saturday nights) reads across one
 * row. Days outside the month are included as `null` so the grid is square.
 */
export function monthGrid(month: string): (IsoDate | null)[][] {
  const first = firstOfMonth(month);
  const lead = weekdayMon0(first);
  const days = nightsOfMonth(month);
  const cells: (IsoDate | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (IsoDate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Every date from a to b inclusive, whichever way round they were given. */
export function rangeInclusive(a: IsoDate, b: IsoDate): IsoDate[] {
  const [from, to] = a <= b ? [a, b] : [b, a];
  const out: IsoDate[] = [];
  for (let at = utc(from), end = utc(to); at <= end; at += 86_400_000) out.push(iso(at));
  return out;
}

export type Preset = "weekends" | "weekdays" | "month";

/**
 * The presets a hotel actually prices by: Friday and Saturday nights (the
 * weekend rate), Sunday to Thursday nights, and every night of the month
 * (December in Lagos). Past nights are left out: a price for a night that
 * has gone is a price nobody can pay.
 */
export function presetNights(month: string, preset: Preset, today: IsoDate): IsoDate[] {
  return nightsOfMonth(month).filter((date) => {
    if (date < today) return false;
    const day = weekdayMon0(date);
    if (preset === "weekends") return day === 4 || day === 5;
    if (preset === "weekdays") return day !== 4 && day !== 5;
    return true;
  });
}

/** Dates sorted, unique, valid and not before today. */
export function cleanSelection(dates: readonly string[], today: IsoDate): IsoDate[] {
  return [...new Set(dates.filter((d) => isIsoDate(d) && d >= today))].sort();
}

/**
 * The runs a selection is made of, for the sentence the sheet prints:
 * "3 to 5 Dec and 12 Dec" reads; a list of nine dates does not.
 */
export function runsOf(dates: readonly IsoDate[]): { from: IsoDate; to: IsoDate }[] {
  const sorted = [...new Set(dates)].sort();
  const runs: { from: IsoDate; to: IsoDate }[] = [];
  for (const date of sorted) {
    const last = runs[runs.length - 1];
    if (last && addDays(last.to, 1) === date) last.to = date;
    else runs.push({ from: date, to: date });
  }
  return runs;
}

const SHORT = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });

function short(date: IsoDate): string {
  return SHORT.format(new Date(utc(date)));
}

/** "3 to 5 Dec, 12 Dec" (at most three runs, then "and N more"). */
export function describeSelection(dates: readonly IsoDate[]): string {
  const runs = runsOf(dates);
  if (runs.length === 0) return "No nights";
  const words = runs.slice(0, 3).map((run) => (run.from === run.to ? short(run.from) : `${short(run.from)} to ${short(run.to)}`));
  const more = runs.length - 3;
  return more > 0 ? `${words.join(", ")} and ${more} more` : words.join(", ");
}

/* ------------------------------------------------------------ the cells */

export type RatePlanLite = {
  id: string;
  name: string;
  rateMinor: number;
  active: boolean;
  minStayNights?: number;
  maxStayNights?: number | null;
};

export type CalendarRoom = {
  id: string;
  name: string;
  unitsTotal: number;
  status: string;
  plans: RatePlanLite[];
};

/** Rows as read, keyed by `${id}|${date}`. */
export type CalendarRows = {
  /** rate_calendar, by `${ratePlanId}|${date}`. */
  rates: Map<string, { rateMinor: number | null; closed: boolean }>;
  /** room_inventory, by `${roomTypeId}|${date}`. */
  inventory: Map<string, { unitsOpen: number; unitsBooked: number }>;
  /** Nights another site's calendar blocked, by `${roomTypeId}|${date}`: the source label. */
  imported: Map<string, string>;
  /** C2b: how many rooms other sites hold that night (one per linked calendar), by `${roomTypeId}|${date}`. */
  held?: Map<string, number>;
};

export type NightCell = {
  date: IsoDate;
  past: boolean;
  /** The plan's own rate. */
  baseMinor: number | null;
  /** This night's own price, when the host set one. */
  overrideMinor: number | null;
  /** What a guest is charged for this night on this plan: override ?? base. */
  priceMinor: number | null;
  /** Closed on this plan (rate_calendar) or no room left open (inventory 0). */
  closed: boolean;
  /** Null when there is no inventory row: the night is not offered at all. */
  unitsOpen: number | null;
  unitsBooked: number;
  /** "Airbnb", when another site's calendar holds a room this night. */
  imported: string | null;
  /** Rooms other sites hold this night (0 when none). */
  held: number;
};

export function rowKey(id: string, date: IsoDate): string {
  return `${id}|${date}`;
}

/** The plan a room is priced by on the calendar: the first active one, else the first. */
export function primaryPlan(room: CalendarRoom, wanted?: string | null): RatePlanLite | null {
  if (wanted) {
    const hit = room.plans.find((plan) => plan.id === wanted);
    if (hit) return hit;
  }
  return room.plans.find((plan) => plan.active) ?? room.plans[0] ?? null;
}

export function cellFor(
  room: CalendarRoom,
  plan: RatePlanLite | null,
  date: IsoDate,
  rows: CalendarRows,
  today: IsoDate,
): NightCell {
  const rate = plan ? rows.rates.get(rowKey(plan.id, date)) : undefined;
  const inv = rows.inventory.get(rowKey(room.id, date));
  const baseMinor = plan ? plan.rateMinor : null;
  const overrideMinor = rate?.rateMinor ?? null;
  return {
    date,
    past: date < today,
    baseMinor,
    overrideMinor,
    priceMinor: overrideMinor ?? baseMinor,
    closed: Boolean(rate?.closed) || inv?.unitsOpen === 0,
    unitsOpen: inv ? inv.unitsOpen : null,
    unitsBooked: inv ? inv.unitsBooked : 0,
    imported: rows.imported.get(rowKey(room.id, date)) ?? null,
    held: rows.held?.get(rowKey(room.id, date)) ?? (rows.imported.has(rowKey(room.id, date)) ? 1 : 0),
  };
}

export type CellTone = "past" | "closed" | "imported" | "full" | "none" | "override" | "open";

/**
 * One word for how a cell is drawn, in priority order. A night that has gone
 * is past whatever else is true; a night another site took reads as that
 * before it reads as closed, because the host needs to know WHY it is shut.
 */
export function toneOf(cell: NightCell): CellTone {
  if (cell.past) return "past";
  /* C2b: a booking on another site takes ONE room, so a night reads as
     "booked elsewhere" only once no room is left for Vallo to sell. */
  if (cell.imported && (cell.unitsOpen === null || cell.unitsOpen - cell.unitsBooked <= 0)) return "imported";
  if (cell.closed) return "closed";
  if (cell.unitsOpen === null) return "none";
  if (cell.unitsOpen > 0 && cell.unitsBooked >= cell.unitsOpen) return "full";
  if (cell.overrideMinor !== null && cell.overrideMinor !== cell.baseMinor) return "override";
  return "open";
}

/** "1 held by Airbnb", "2 held by Airbnb, Booking.com": what another site holds. */
export function heldWords(cell: Pick<NightCell, "held" | "imported">): string | null {
  if (!cell.imported || cell.held <= 0) return null;
  return `${cell.held} held by ${cell.imported}`;
}

/** Naira typed by a person ("45,000", "₦45000", "45000.50") to kobo, or null. */
export function nairaToMinor(value: string): number | null {
  const cleaned = value.replace(/[₦,\s]/g, "").replace(/^N/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

/**
 * The fewest rooms a run of nights may be left with: what is already held on
 * the busiest of them. The database refuses less (`units_booked <= units_open`);
 * the sheet says the floor before anybody taps.
 */
export function bookedFloor(cells: readonly NightCell[]): number {
  return cells.reduce((max, cell) => Math.max(max, cell.unitsBooked), 0);
}
