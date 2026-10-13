import type { InspectionState } from "@/lib/inspections/types";

/**
 * THE VISIT CALENDAR, AS PURE ARITHMETIC (13 October 2026).
 *
 * One model under two screens: the lister's calendar on /agent/inspections
 * and the console's on /admin/bookings/visits. Both place a visit on the
 * LAGOS day it is for, filter it by the same five words, and draw the same
 * week strip and month grid, so the two can never disagree about which day a
 * viewing sits on.
 *
 * WHERE A VISIT SITS. On the agreed time once there is one (`slot_at`), and
 * on the time the renter asked for until then (`requested_at`). A request
 * nobody has answered still belongs on the day it is for, because that is
 * the day the lister has to decide about.
 *
 * TIME IS LAGOS TIME. Africa/Lagos is UTC+1 all year with no daylight saving,
 * so a Lagos day is a fixed one hour offset from UTC and is computed without
 * a timezone library, as `lib/admin/reads/shared.ts` does on the server. This
 * file has no `server-only` import, so the browser can use it too.
 *
 * WEEKS START ON MONDAY.
 */

export const LAGOS_OFFSET_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** How the visit happens (`inspection_requests.visit_mode`). */
export type VisitMode = "in_person" | "video";

export function visitModeFrom(value: unknown): VisitMode {
  return value === "video" ? "video" : "in_person";
}

/** The five filters the calendars offer, in the order they are drawn. */
export const VISIT_FILTERS = ["requested", "proposed", "confirmed", "done", "missed"] as const;
export type VisitFilter = (typeof VISIT_FILTERS)[number];

/** Every chip a visit row can carry: the five filters and the two closed states that have none. */
export type VisitChip = VisitFilter | "declined" | "withdrawn";

/** Which word a state is drawn with. Exhaustive, so a new state is a compile error here. */
const CHIP: Record<InspectionState, VisitChip> = {
  REQUESTED: "requested",
  PROPOSED: "proposed",
  CONFIRMED: "confirmed",
  COMPLETED: "done",
  NO_SHOW: "missed",
  DECLINED: "declined",
  WITHDRAWN: "withdrawn",
};

export function chipOf(state: InspectionState): VisitChip {
  return CHIP[state];
}

/** The filter a state answers to, or null for the two closed states no filter names. */
export function filterOf(state: InspectionState): VisitFilter | null {
  const chip = CHIP[state];
  return (VISIT_FILTERS as readonly string[]).includes(chip) ? (chip as VisitFilter) : null;
}

export function isVisitFilter(value: unknown): value is VisitFilter {
  return typeof value === "string" && (VISIT_FILTERS as readonly string[]).includes(value);
}

/** The states a filter selects (the console reads by state). */
export function statesFor(filter: VisitFilter): InspectionState[] {
  return (Object.keys(CHIP) as InspectionState[]).filter((state) => CHIP[state] === filter);
}

/**
 * The chip's tone, in the shared status vocabulary: waiting on somebody is
 * pending, booked is info, held is success, missed or refused is error, and
 * a withdrawal is quiet.
 */
export type VisitTone = "pending" | "info" | "success" | "error" | "quiet";

const TONE: Record<VisitChip, VisitTone> = {
  requested: "pending",
  proposed: "pending",
  confirmed: "info",
  done: "success",
  missed: "error",
  declined: "error",
  withdrawn: "quiet",
};

export function toneOf(chip: VisitChip): VisitTone {
  return TONE[chip];
}

/** The states still ahead of somebody: asked, offered another time, or booked. */
export function isLiveState(state: InspectionState): boolean {
  return state === "REQUESTED" || state === "PROPOSED" || state === "CONFIRMED";
}

/** Where a visit sits: the agreed time, or the asked time until one is agreed. */
export function visitAt(row: { slotAt: string | null; requestedAt: string }): string {
  return row.slotAt ?? row.requestedAt;
}

/** The Lagos calendar day of an instant, `YYYY-MM-DD`. */
export function lagosDay(at: string | number | Date): string {
  const ms = typeof at === "number" ? at : typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** The Lagos clock time of an instant, `HH:MM`, 24 hours. */
export function lagosTime(at: string): string {
  return new Date(Date.parse(at) + LAGOS_OFFSET_MS).toISOString().slice(11, 16);
}

/** True for a well formed `YYYY-MM-DD` that names a real date. */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 0 for Monday through 6 for Sunday. */
export function weekdayIndex(day: string): number {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** The Monday of the week a day is in. */
export function weekStart(day: string): string {
  return shiftDay(day, -weekdayIndex(day));
}

/** The seven days of the week a day is in, Monday first. */
export function weekOf(day: string): string[] {
  const monday = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}

/** `YYYY-MM` of a day. */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/** The same day of the month `n` months away, clamped to that month's last day. */
export function shiftMonth(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

export type GridCell = { day: string; inMonth: boolean };

/**
 * The month as whole weeks, Monday first: the days before the 1st and after
 * the last that complete its first and last weeks are in the grid and marked
 * `inMonth: false`. Four to six rows, never a padded seventh.
 */
export function monthGrid(day: string): GridCell[] {
  const first = `${monthOf(day)}-01`;
  const lastOfMonth = shiftDay(shiftMonth(first, 1), -1);
  const start = weekStart(first);
  const end = shiftDay(weekStart(lastOfMonth), 6);
  const cells: GridCell[] = [];
  for (let at = start; at <= end; at = shiftDay(at, 1)) {
    cells.push({ day: at, inMonth: monthOf(at) === monthOf(day) });
  }
  return cells;
}

/** The first and the last day a view draws, inclusive. */
export function rangeOf(view: "week" | "month", day: string): { from: string; to: string } {
  if (view === "week") {
    const days = weekOf(day);
    return { from: days[0]!, to: days[6]! };
  }
  const grid = monthGrid(day);
  return { from: grid[0]!.day, to: grid[grid.length - 1]!.day };
}

/** The instant a Lagos day begins, as ISO. */
export function lagosDayStartIso(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - LAGOS_OFFSET_MS).toISOString();
}

/**
 * Rows by the Lagos day they sit on, each day earliest first (ties by id, so
 * the order is stable from render to render). Days with nothing are absent.
 */
export function groupByDay<T extends { id: string; at: string }>(rows: readonly T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const key = lagosDay(row.at);
    const list = out.get(key);
    if (list) list.push(row);
    else out.set(key, [row]);
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  }
  return out;
}

/** Rows a filter keeps; `all` keeps every row, the two closed states included. */
export function applyFilter<T extends { state: InspectionState }>(rows: readonly T[], filter: VisitFilter | "all"): T[] {
  if (filter === "all") return [...rows];
  return rows.filter((row) => filterOf(row.state) === filter);
}

/** How many rows each filter would keep, for the counts on the chips. */
export function filterCounts<T extends { state: InspectionState }>(rows: readonly T[]): Record<VisitFilter | "all", number> {
  const counts = { all: rows.length, requested: 0, proposed: 0, confirmed: 0, done: 0, missed: 0 };
  for (const row of rows) {
    const filter = filterOf(row.state);
    if (filter) counts[filter] += 1;
  }
  return counts;
}

export type VisitSummary = {
  /** Live visits on today's Lagos date. */
  today: number;
  /** Live visits on the seven Lagos days after today. */
  next7: number;
  /** Requests waiting on this lister's answer, whatever day they are for. */
  needsAnswer: number;
};

/**
 * The three figures at the top of the lister's calendar. Only live visits
 * count towards Today and Next 7 days: a declined request on Saturday is not
 * a visit on Saturday.
 */
export function summarise<T extends { at: string; state: InspectionState }>(rows: readonly T[], today: string): VisitSummary {
  const horizon = shiftDay(today, 7);
  let todayCount = 0;
  let next7 = 0;
  let needsAnswer = 0;
  for (const row of rows) {
    if (row.state === "REQUESTED") needsAnswer += 1;
    if (!isLiveState(row.state)) continue;
    const day = lagosDay(row.at);
    if (day === today) todayCount += 1;
    else if (day > today && day <= horizon) next7 += 1;
  }
  return { today: todayCount, next7, needsAnswer };
}

/** The view a URL or a stored choice asks for, week by default. */
export function viewFrom(value: unknown): "week" | "month" {
  return value === "month" ? "month" : "week";
}
