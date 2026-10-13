import type { HostReservationView } from "@/lib/reservations/queries";
import type { HostTableBoard } from "./board";

/**
 * THE TABLE DESK, ARRANGED (track/restaurant-desk).
 *
 * Pure: the board as the reader hands it over (`requests`, `upcoming`, `past`),
 * re-cut the way a restaurant works a day. Today first, with its four figures,
 * then the days ahead, then what has gone. Everything is on the Lagos clock,
 * because that is where the kitchen is, and the instant the server rendered
 * at is passed in so the server and the browser cut the same day.
 *
 * No figure here is estimated. Each one is a count of rows the venue can see
 * on the same screen:
 *
 *   covers     guests at today's confirmed tables, seated ones included
 *              (the kitchen's number for the day), and how many tables
 *   toConfirm  today's requests still ahead, and how many more wait on
 *              later days
 *   seated     today's tables marked seated, and their guests
 *   done       today's tables marked seated or no-show, of today's booked
 *              tables (confirmed, seated or no-show)
 */

const LAGOS = "Africa/Lagos";

/** "2026-10-13": the Lagos calendar day of an instant, or "" when it is not one. */
export function lagosDay(at: string | number | Date): string {
  const when = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(when.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(when);
}

/** "Tuesday, 13 October": the header's date, on the Lagos clock. */
export function longDayLabel(at: Date): string {
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleDateString("en-NG", { timeZone: LAGOS, weekday: "long", day: "numeric", month: "long" });
}

export type DeskTable = HostReservationView & {
  /** The Lagos day of the table. */
  day: string;
  /** A request the venue can still answer. */
  decidable: boolean;
  /** The table's moment has gone, so Seated or No-show may be marked. */
  passed: boolean;
};

export type DeskDay = {
  day: string;
  tables: DeskTable[];
  /** Tables on this day still booked (requests and confirmed). */
  live: number;
  /** Guests at those tables. */
  guests: number;
};

export type DeskFigures = {
  coversExpected: number;
  coverTables: number;
  toConfirm: number;
  toConfirmLater: number;
  seated: number;
  seatedGuests: number;
  done: number;
  booked: number;
};

export type Desk = {
  today: string;
  todayTables: DeskTable[];
  figures: DeskFigures;
  upcoming: DeskDay[];
  earlier: DeskTable[];
  /** Every table on the desk, once. */
  count: number;
};

function byTime(a: DeskTable, b: DeskTable): number {
  return a.reservedFor.localeCompare(b.reservedFor);
}

/** The board, cut into today, the days ahead and what has gone. */
export function buildDesk(board: HostTableBoard, now: Date): Desk {
  const instant = now.getTime();
  const today = lagosDay(now);
  const seen = new Set<string>();
  const tables: DeskTable[] = [];
  for (const row of [...board.requests, ...board.upcoming, ...board.past]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const at = Date.parse(row.reservedFor);
    const passed = Number.isFinite(at) ? at <= instant : true;
    tables.push({
      ...row,
      day: lagosDay(row.reservedFor),
      decidable: row.status === "PENDING" && !passed,
      passed,
    });
  }

  const todayTables = tables.filter((t) => t.day === today).sort(byTime);
  const later = tables.filter((t) => t.day > today).sort(byTime);
  const earlier = tables.filter((t) => t.day < today).sort((a, b) => byTime(b, a));

  const upcoming: DeskDay[] = [];
  for (const table of later) {
    let group = upcoming[upcoming.length - 1];
    if (!group || group.day !== table.day) {
      group = { day: table.day, tables: [], live: 0, guests: 0 };
      upcoming.push(group);
    }
    group.tables.push(table);
    if (table.status === "PENDING" || table.status === "CONFIRMED") {
      group.live += 1;
      group.guests += table.partySize;
    }
  }

  const covered = todayTables.filter((t) => t.status === "CONFIRMED" || t.status === "COMPLETED");
  const seated = todayTables.filter((t) => t.status === "COMPLETED");
  const marked = todayTables.filter((t) => t.status === "COMPLETED" || t.status === "NO_SHOW");
  const booked = todayTables.filter(
    (t) => t.status === "CONFIRMED" || t.status === "COMPLETED" || t.status === "NO_SHOW",
  );

  return {
    today,
    todayTables,
    figures: {
      coversExpected: covered.reduce((sum, t) => sum + t.partySize, 0),
      coverTables: covered.length,
      toConfirm: todayTables.filter((t) => t.decidable).length,
      toConfirmLater: later.filter((t) => t.decidable).length,
      seated: seated.length,
      seatedGuests: seated.reduce((sum, t) => sum + t.partySize, 0),
      done: marked.length,
      booked: booked.length,
    },
    upcoming,
    earlier,
    count: tables.length,
  };
}

/**
 * Whether a table matches what the venue typed: the guest's name, the note,
 * the venue, or the party size ("4" finds every table for four). Case and
 * accents are ignored; an empty search matches everything.
 */
export function matchesSearch(table: HostReservationView, query: string): boolean {
  const q = fold(query.trim());
  if (q.length === 0) return true;
  if (/^[0-9]+$/.test(q)) {
    if (String(table.partySize) === q) return true;
  }
  return [table.guestName, table.note ?? "", table.listingTitle, table.location]
    .some((field) => fold(field).includes(q));
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** The desk with only the tables that match, the figures untouched (they describe the day, not the search). */
export function filterDesk(desk: Desk, query: string): Desk {
  if (query.trim().length === 0) return desk;
  const keep = (t: DeskTable) => matchesSearch(t, query);
  const upcoming = desk.upcoming
    .map((group) => ({ ...group, tables: group.tables.filter(keep) }))
    .filter((group) => group.tables.length > 0);
  const todayTables = desk.todayTables.filter(keep);
  const earlier = desk.earlier.filter(keep);
  return {
    ...desk,
    todayTables,
    upcoming,
    earlier,
    count: todayTables.length + earlier.length + upcoming.reduce((n, g) => n + g.tables.length, 0),
  };
}
