/**
 * THE HOST'S "TODAY", AS ARITHMETIC (plan item 14, spec 13.1).
 *
 * Every figure on the host workspace home comes out of this file, and every
 * input is a row the host's own reads already returned: the room bookings
 * (`readHostRoomBookings`), the table board (`readHostTableBoard`), the unread
 * count (`my_unread_counts`), the application in progress and the businesses.
 * Nothing is fetched here and nothing is estimated. A source that could not
 * be read is passed as null and its figure is left out, never drawn as zero:
 * a zero is a fact, a failed read is not.
 *
 * "Today" is the Lagos calendar day, because that is the day a host in
 * Nigeria is having, whatever the server's clock says.
 */

export type TodayRoomBooking = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  hotel: string;
  room: string;
  createdAt: string;
};

export type TodayTable = {
  id: string;
  status: string;
  reservedFor: string;
  guestName: string;
  partySize: number;
};

export type TodayBusiness = { id: string; name: string; status: string };

export type TodayInput = {
  now: Date;
  /** Null when the room bookings could not be read. */
  rooms: { waiting: TodayRoomBooking[]; upcoming: TodayRoomBooking[]; past: TodayRoomBooking[] } | null;
  /** Null when the table board could not be read. */
  tables: { requests: TodayTable[]; upcoming: TodayTable[]; past: TodayTable[] } | null;
  /** Null when the unread count could not be read. */
  unread: number | null;
  businesses: TodayBusiness[];
  /** The application in progress: how many things are still missing. */
  draft: { name: string; missing: number; submitted: boolean } | null;
};

export type TodayKpi = {
  key: "arriving" | "staying" | "requests" | "unread";
  value: number;
  href: string;
};

export type TodayStage = {
  key: "requested" | "confirmed" | "staying" | "completed";
  count: number;
};

export type TodayAttention = {
  key: string;
  kind: "request" | "table" | "draft" | "stopped";
  tone: "warning" | "error" | "neutral";
  title: string;
  sub: string;
  href: string;
  /** When it started waiting, for the order: oldest first. */
  since: string;
};

export type HostToday = {
  /** The Lagos calendar day, YYYY-MM-DD. */
  day: string;
  kpis: TodayKpi[];
  /** Empty when no reservation of any kind exists: the gauge is left out. */
  stages: TodayStage[];
  attention: TodayAttention[];
  /** The sum of the four KPI figures that were read. Zero means "nothing needs you". */
  needsYou: number;
};

/** A business's review state, in the words the host reads everywhere. */
export const HOST_STATUS_WORD: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "With our team",
  UNDER_REVIEW: "Being read",
  MORE_INFO_REQUIRED: "Needs more from you",
  APPROVED: "Approved",
  PUBLISHED: "Live",
  REJECTED: "Not approved",
  SUSPENDED: "Suspended",
};

const STOPPED = new Set(["SUSPENDED", "REJECTED", "MORE_INFO_REQUIRED"]);

/** The Lagos calendar day for an instant, as YYYY-MM-DD. */
export function lagosDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function hostToday(input: TodayInput): HostToday {
  const day = lagosDay(input.now);
  const kpis: TodayKpi[] = [];
  const rooms = input.rooms;
  const tables = input.tables;

  const tablesToday = (list: TodayTable[]) =>
    list.filter((row) => {
      const at = new Date(row.reservedFor);
      return Number.isFinite(at.getTime()) && lagosDay(at) === day;
    });

  if (rooms || tables) {
    const arrivingRooms = rooms ? rooms.upcoming.filter((b) => b.checkIn === day).length : 0;
    /* Tables still ahead today, and tables already seated today, both arrive today. */
    const arrivingTables = tables
      ? tablesToday(tables.upcoming).length +
        tablesToday(tables.past).filter((row) => row.status === "CONFIRMED").length
      : 0;
    kpis.push({ key: "arriving", value: arrivingRooms + arrivingTables, href: "/host/bookings" });
  }
  if (rooms) {
    const staying = rooms.upcoming.filter((b) => b.checkIn <= day && b.checkOut > day).length;
    kpis.push({ key: "staying", value: staying, href: "/host/bookings" });
  }
  if (rooms || tables) {
    const waiting = (rooms?.waiting.length ?? 0) + (tables?.requests.length ?? 0);
    kpis.push({
      key: "requests",
      value: waiting,
      /* C3: the one decide-by list, with the clock on every request. */
      href: "/host/decide",
    });
  }
  if (input.unread !== null) {
    kpis.push({ key: "unread", value: input.unread, href: "/messages" });
  }

  const stages: TodayStage[] = [];
  if (rooms || tables) {
    const requested = (rooms?.waiting.length ?? 0) + (tables?.requests.length ?? 0);
    const confirmedRooms = rooms ? rooms.upcoming.filter((b) => b.checkIn > day).length : 0;
    const staying = rooms ? rooms.upcoming.filter((b) => b.checkIn <= day && b.checkOut > day).length : 0;
    const completedRooms = rooms
      ? rooms.past.filter((b) => b.status === "COMPLETED" || (b.status === "CONFIRMED" && b.checkOut <= day)).length
      : 0;
    const confirmedTables = tables ? tables.upcoming.length : 0;
    const completedTables = tables ? tables.past.filter((row) => row.status === "CONFIRMED").length : 0;
    const all = [
      { key: "requested" as const, count: requested },
      { key: "confirmed" as const, count: confirmedRooms + confirmedTables },
      { key: "staying" as const, count: staying },
      { key: "completed" as const, count: completedRooms + completedTables },
    ];
    if (all.some((stage) => stage.count > 0)) stages.push(...all);
  }

  const attention: TodayAttention[] = [];
  for (const b of rooms?.waiting ?? []) {
    attention.push({
      key: `room-${b.id}`,
      kind: "request",
      tone: "warning",
      title: `${b.room} · ${b.hotel}`,
      sub: b.guestName,
      href: "/host/decide",
      since: b.createdAt,
    });
  }
  for (const row of tables?.requests ?? []) {
    attention.push({
      key: `table-${row.id}`,
      kind: "table",
      tone: "warning",
      title: row.guestName,
      sub: row.reservedFor,
      href: "/host/decide",
      since: row.reservedFor,
    });
  }
  for (const business of input.businesses) {
    if (!STOPPED.has(business.status)) continue;
    attention.push({
      key: `business-${business.id}`,
      kind: "stopped",
      tone: business.status === "MORE_INFO_REQUIRED" ? "warning" : "error",
      title: business.name,
      sub: business.status,
      href: "/host/apply",
      since: "",
    });
  }
  if (input.draft && !input.draft.submitted) {
    attention.push({
      key: "draft",
      kind: "draft",
      tone: "neutral",
      title: input.draft.name,
      sub: String(input.draft.missing),
      href: "/host/apply",
      since: "",
    });
  }
  /* Oldest waiting first; the ones with no clock (a stop, a draft) after. */
  attention.sort((a, b) => {
    if (!a.since && !b.since) return 0;
    if (!a.since) return 1;
    if (!b.since) return -1;
    return a.since.localeCompare(b.since);
  });

  const needsYou = kpis
    .filter((kpi) => kpi.key === "arriving" || kpi.key === "requests" || kpi.key === "unread")
    .reduce((total, kpi) => total + kpi.value, 0);

  return { day, kpis, stages, attention, needsYou };
}
