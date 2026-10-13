/**
 * THE TAPE CHART, AS ARITHMETIC (track/hospitality-workspace).
 *
 * A hotel's next two weeks laid out the way a front desk reads them: the room
 * types down the side, the days across the top, a bar for every stay. Pure and
 * client-safe: every input is a row the host's own reads returned, every
 * figure is a count of those rows, nothing is estimated.
 *
 * WHAT THE DATABASE KNOWS, AND WHAT THIS DRAWS FROM IT.
 *
 *   room_types.units_total    how many rooms of the type exist
 *   room_inventory            per type and night: units_open (rooms on sale),
 *                             units_booked (rooms held by a PENDING or
 *                             CONFIRMED stay). A night with no row is not on
 *                             sale.
 *   bookings                  the stays. They name a room TYPE and a number of
 *                             rooms, never one numbered room: nothing in the
 *                             database assigns a stay to a physical room, so
 *                             the chart does not either. The lanes under a
 *                             room type only keep bars from overlapping.
 *
 *   available  = units_open - units_booked      (what the rate calendar says)
 *   blocked    = units_total - units_open       (rooms the host took off sale)
 *   occupancy  = units_booked / units_total, rounded
 *
 * DAYS ARE LAGOS DAYS. `check_in` and `check_out` are calendar dates, and the
 * window starts on the Lagos date of the instant the page rendered at, so a
 * request at 23:30 UTC (00:30 in Lagos) opens on tomorrow's date.
 *
 * HALF-DAY BARS. A stay occupies the nights from `check_in` up to but not
 * including `check_out`, and a guest is in the building on the departure
 * morning. Each day is therefore two half-columns (`HALF`) and a bar runs from
 * the second half of its arrival day to the first half of its departure day.
 * One guest leaving and another arriving on the same day sit end to end, not
 * on top of each other, and a guest leaving today is still on the chart.
 */

export const TAPE_DAYS = 14;
/** Half-columns per day. */
export const HALF = 2;

const LAGOS = "Africa/Lagos";
const DAY_MS = 86_400_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The Lagos calendar day of an instant, "YYYY-MM-DD". */
export function lagosDayOf(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function utc(day: string): number {
  if (!DAY.test(day)) return Number.NaN;
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** A day plus n days (n may be negative), "YYYY-MM-DD". */
export function addDays(day: string, n: number): string {
  return new Date(utc(day) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from a to b (b minus a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / DAY_MS);
}

export type TapeDay = {
  date: string;
  /** 0 is Sunday. */
  weekday: number;
  weekend: boolean;
  today: boolean;
  /** Zero-based column. */
  index: number;
};

/** The window's days, from `today`. */
export function tapeDays(today: string, count: number = TAPE_DAYS): TapeDay[] {
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index);
    const weekday = new Date(utc(date)).getUTCDay();
    return { date, weekday, weekend: weekday === 0 || weekday === 6, today: index === 0, index };
  });
}

export type TapeRoomType = { id: string; name: string; hotel: string; unitsTotal: number };
export type TapeInventory = { roomTypeId: string; date: string; unitsOpen: number; unitsBooked: number };
export type TapeStay = {
  id: string;
  roomTypeId: string;
  status: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  /** The guest's display name; null when it could not be read. */
  guestName: string | null;
  /** True once a payment settled; null when that could not be read. */
  paid: boolean | null;
};

/** The statuses that draw a bar. A cancelled or declined stay holds nothing. */
export const DRAWN = new Set(["PENDING", "CONFIRMED", "COMPLETED"]);

export type TapeCell = {
  date: string;
  /** Rooms on sale that night; null when the night has no inventory row. */
  open: number | null;
  booked: number | null;
  available: number | null;
  /** Rooms the host took off sale; null when the night has no row. */
  blocked: number | null;
  /** Whole percent of the type's rooms that are booked; null when unknown. */
  occupancyPct: number | null;
};

export type TapeBar = {
  id: string;
  guestName: string | null;
  status: string;
  rooms: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  /** One-based grid lines over the half-columns; the end line is exclusive. */
  startLine: number;
  endLine: number;
  clippedStart: boolean;
  clippedEnd: boolean;
  inHouse: boolean;
  arriving: boolean;
  dueOut: boolean;
  paid: boolean | null;
};

export type TapeGroup = {
  roomType: TapeRoomType;
  cells: TapeCell[];
  /** Bars in rows so none overlap. Not rooms: see the header. */
  lanes: TapeBar[][];
  /** Tonight's figures for the type (the first day of the window). */
  vacant: boolean;
  occupied: boolean;
  dueOut: boolean;
};

export type TapeFilter = "all" | "vacant" | "occupied" | "dueOut";

export type TapeChart = {
  today: string;
  days: TapeDay[];
  groups: TapeGroup[];
  /** All room types together, per day. */
  totals: TapeCell[];
  tonight: { booked: number; total: number; pct: number | null };
  /** How many room types each chip would show. */
  counts: Record<TapeFilter, number>;
};

function cellFor(roomType: TapeRoomType, date: string, row: TapeInventory | undefined): TapeCell {
  if (!row) return { date, open: null, booked: null, available: null, blocked: null, occupancyPct: null };
  const booked = Math.max(row.unitsBooked, 0);
  const open = Math.max(row.unitsOpen, 0);
  return {
    date,
    open,
    booked,
    available: Math.max(open - booked, 0),
    blocked: Math.max(roomType.unitsTotal - open, 0),
    occupancyPct: roomType.unitsTotal > 0 ? Math.min(100, Math.round((booked / roomType.unitsTotal) * 100)) : null,
  };
}

/**
 * One stay as a bar in the window, or null when it does not touch it. A stay
 * that began before the window starts on the first half-column and says so
 * (`clippedStart`); one that ends after it runs to the last and says so.
 */
export function barFor(stay: TapeStay, today: string, days: number = TAPE_DAYS): TapeBar | null {
  if (!DRAWN.has(stay.status)) return null;
  const from = daysBetween(today, stay.checkIn);
  const to = daysBetween(today, stay.checkOut);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;
  /* The departure morning is the first half of `to`; it is on the chart from
     day zero. Nothing before the window, nothing after it. */
  if (to < 0 || from > days - 1) return null;
  const clippedStart = from < 0;
  const clippedEnd = to > days - 1;
  const startLine = clippedStart ? 1 : from * HALF + 2;
  const endLine = clippedEnd ? days * HALF + 1 : to * HALF + 1 + 1;
  return {
    id: stay.id,
    guestName: stay.guestName,
    status: stay.status,
    rooms: Math.max(stay.rooms, 1),
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    /* The whole stay, not the part inside the window. */
    nights: to - from,
    startLine,
    endLine,
    clippedStart,
    clippedEnd,
    inHouse: stay.checkIn <= today && today < stay.checkOut,
    arriving: stay.checkIn === today,
    dueOut: stay.checkOut === today,
    paid: stay.paid,
  };
}

/** Lanes by greedy packing: each bar goes to the first row it does not overlap. */
export function packLanes(bars: readonly TapeBar[]): TapeBar[][] {
  const sorted = [...bars].sort(
    (a, b) => a.startLine - b.startLine || a.endLine - b.endLine || a.id.localeCompare(b.id),
  );
  const lanes: TapeBar[][] = [];
  const ends: number[] = [];
  for (const bar of sorted) {
    let lane = ends.findIndex((end) => end <= bar.startLine);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push([]);
      ends.push(0);
    }
    lanes[lane]!.push(bar);
    ends[lane] = bar.endLine;
  }
  return lanes;
}

export function buildTapeChart(input: {
  today: string;
  roomTypes: readonly TapeRoomType[];
  inventory: readonly TapeInventory[];
  stays: readonly TapeStay[];
  days?: number;
}): TapeChart {
  const count = input.days ?? TAPE_DAYS;
  const days = tapeDays(input.today, count);
  const rows = new Map<string, TapeInventory>();
  for (const row of input.inventory) rows.set(`${row.roomTypeId}|${row.date}`, row);

  const byType = new Map<string, TapeBar[]>();
  for (const stay of input.stays) {
    const bar = barFor(stay, input.today, count);
    if (!bar) continue;
    const list = byType.get(stay.roomTypeId) ?? [];
    list.push(bar);
    byType.set(stay.roomTypeId, list);
  }

  const groups: TapeGroup[] = input.roomTypes.map((roomType) => {
    const cells = days.map((d) => cellFor(roomType, d.date, rows.get(`${roomType.id}|${d.date}`)));
    const bars = byType.get(roomType.id) ?? [];
    const tonight = cells[0];
    return {
      roomType,
      cells,
      lanes: packLanes(bars),
      vacant: (tonight?.available ?? 0) > 0,
      occupied: (tonight?.booked ?? 0) > 0,
      dueOut: bars.some((bar) => bar.dueOut),
    };
  });

  const totals: TapeCell[] = days.map((d, i) => {
    let open = 0;
    let booked = 0;
    let available = 0;
    let blocked = 0;
    let total = 0;
    let known = false;
    for (const group of groups) {
      const cell = group.cells[i]!;
      if (cell.open === null) continue;
      known = true;
      open += cell.open;
      booked += cell.booked ?? 0;
      available += cell.available ?? 0;
      blocked += cell.blocked ?? 0;
      total += group.roomType.unitsTotal;
    }
    if (!known) return { date: d.date, open: null, booked: null, available: null, blocked: null, occupancyPct: null };
    return {
      date: d.date,
      open,
      booked,
      available,
      blocked,
      occupancyPct: total > 0 ? Math.min(100, Math.round((booked / total) * 100)) : null,
    };
  });

  let tonightBooked = 0;
  let tonightTotal = 0;
  for (const group of groups) {
    const cell = group.cells[0];
    if (!cell || cell.open === null) continue;
    tonightBooked += cell.booked ?? 0;
    tonightTotal += group.roomType.unitsTotal;
  }

  return {
    today: input.today,
    days,
    groups,
    totals,
    tonight: {
      booked: tonightBooked,
      total: tonightTotal,
      pct: tonightTotal > 0 ? Math.min(100, Math.round((tonightBooked / tonightTotal) * 100)) : null,
    },
    counts: {
      all: groups.length,
      vacant: groups.filter((g) => g.vacant).length,
      occupied: groups.filter((g) => g.occupied).length,
      dueOut: groups.filter((g) => g.dueOut).length,
    },
  };
}

/** The room types a chip shows. */
export function filterGroups(groups: readonly TapeGroup[], filter: TapeFilter): TapeGroup[] {
  switch (filter) {
    case "vacant":
      return groups.filter((g) => g.vacant);
    case "occupied":
      return groups.filter((g) => g.occupied);
    case "dueOut":
      return groups.filter((g) => g.dueOut);
    default:
      return [...groups];
  }
}
