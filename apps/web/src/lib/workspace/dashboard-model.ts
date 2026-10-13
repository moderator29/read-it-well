/**
 * THE WORKSPACE DASHBOARDS, AS ARITHMETIC. Owner and agent, one file.
 *
 * Everything the two dashboards draw that is not a database read is decided
 * here, in pure functions, so each rule is tested and not trusted:
 *
 *   - Lagos days, months and the month calendar (Africa/Lagos is UTC+1 all
 *     year, so a day is never ambiguous);
 *   - which rent is "paid through Vallo": a tenancy is paid when the
 *     successful payments the lister was paid for its booking cover its
 *     total. The money is read from `my_earnings_history` (transactions the
 *     lister is the payee of), never summed into a balance. There is no
 *     balance here and no way to build one;
 *   - the owner's figures: units, rent due and paid this month, rent paid in
 *     by month, leases ending, renewals in 90 days, the next rent due;
 *   - the agent's figures: enquiries and visits by month, visits this week,
 *     today and by calendar day, the featured listing, the Reminder list.
 *
 * `null` always means "could not be read" and is carried through to the
 * screen, which says so; an empty array or a zero is a real answer. No
 * function here turns an unread input into a zero.
 *
 * Client-safe: no server import.
 */

import { addDays, isDay, lagosDay } from "@/lib/enquiry/followup";
import { tenancyEnd, type RentPeriod } from "@/lib/tenancy/model";

export { addDays, isDay, lagosDay };

/* ------------------------------------------------------------------ days */

/** `YYYY-MM` of a `YYYY-MM-DD` day. */
export function monthKey(day: string): string {
  return day.slice(0, 7);
}

/** The Lagos day an instant (an ISO timestamp) falls on, or null when it is not one. */
export function dayOfInstant(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? lagosDay(new Date(at)) : null;
}

/** Whole days from one `YYYY-MM-DD` to another (later minus earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The last `count` months ending with the current Lagos month, oldest first, as `YYYY-MM`. */
export function lastMonthKeys(today: string, count: number): string[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const out: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const index = y * 12 + (m - 1) - back;
    out.push(`${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`);
  }
  return out;
}

/** The first day of the oldest of the last `count` months: where a six month read starts. */
export function windowStartDay(today: string, count: number): string {
  return `${lastMonthKeys(today, count)[0]!}-01`;
}

/** Count instants into the given months (instants outside them are ignored). */
export function countByMonth(instants: readonly (string | null)[], keys: readonly string[]): number[] {
  const index = new Map(keys.map((key, i) => [key, i]));
  const out = keys.map(() => 0);
  for (const iso of instants) {
    const day = dayOfInstant(iso);
    if (!day) continue;
    const at = index.get(monthKey(day));
    if (at !== undefined) out[at]! += 1;
  }
  return out;
}

/* -------------------------------------------------------------- calendar */

export type CalendarCell = {
  /** `YYYY-MM-DD`, or null for the blank cells that square the grid. */
  day: string | null;
  /** The day of the month, for the label. */
  date: number | null;
  isToday: boolean;
  /** How many visits fall on this day (zero draws no dot). */
  count: number;
};

/**
 * The month of `today` as weeks of seven, Monday first, with the visit count
 * on each day. The counts are the caller's real rows; a day with none is zero
 * and draws no dot.
 */
export function monthGrid(today: string, counts: ReadonlyMap<string, number>): CalendarCell[][] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < lead; i += 1) cells.push({ day: null, date: null, isToday: false, count: 0 });
  for (let d = 1; d <= length; d += 1) {
    const day = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day, date: d, isToday: day === today, count: counts.get(day) ?? 0 });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: null, isToday: false, count: 0 });
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* ---------------------------------------------------------------- visits */

export type Visit = {
  id: string;
  /** ISO instant of the booked slot. */
  slotAt: string;
  state: "CONFIRMED" | "COMPLETED";
  listingTitle: string | null;
};

/** Visit rows from the client; a row without a real slot or a counted state is dropped. */
export function parseVisits(data: unknown): Visit[] {
  if (!Array.isArray(data)) return [];
  const out: Visit[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const state = r.state === "CONFIRMED" || r.state === "COMPLETED" ? r.state : null;
    if (typeof r.id !== "string" || typeof r.slot_at !== "string" || !state || dayOfInstant(r.slot_at) === null) continue;
    const listing = Array.isArray(r.listings) ? r.listings[0] : r.listings;
    const title =
      listing && typeof listing === "object" && typeof (listing as { title?: unknown }).title === "string"
        ? (listing as { title: string }).title
        : null;
    out.push({ id: r.id, slotAt: r.slot_at, state, listingTitle: title });
  }
  return out;
}

/** Confirmed visits that have not happened yet, soonest first. */
export function upcomingVisits(visits: readonly Visit[], now: Date): Visit[] {
  return visits
    .filter((v) => v.state === "CONFIRMED" && Date.parse(v.slotAt) >= now.getTime())
    .sort((a, b) => a.slotAt.localeCompare(b.slotAt));
}

/** Confirmed visits from now to the end of the seventh day (today and six more), soonest first. */
export function visitsThisWeek(visits: readonly Visit[], now: Date): Visit[] {
  const last = addDays(lagosDay(now), 6);
  return upcomingVisits(visits, now).filter((v) => (dayOfInstant(v.slotAt) ?? "9999") <= last);
}

/** Confirmed visits on today's Lagos day that have not happened yet, soonest first. */
export function visitsToday(visits: readonly Visit[], now: Date): Visit[] {
  const today = lagosDay(now);
  return upcomingVisits(visits, now).filter((v) => dayOfInstant(v.slotAt) === today);
}

/** Visits by Lagos day, for the calendar's dots: confirmed and completed both count. */
export function visitCountsByDay(visits: readonly Visit[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const v of visits) {
    const day = dayOfInstant(v.slotAt);
    if (day) out.set(day, (out.get(day) ?? 0) + 1);
  }
  return out;
}

/* ----------------------------------------------------------------- owner */

/** One of the owner's rental units, from `my_buildings`. */
export type Building = {
  listingId: string;
  place: string;
  bedrooms: number | null;
  status: string;
  letState: "let" | "vacant";
  tenancyEndsOn: string | null;
  rentMinor: number | null;
  rentPeriod: RentPeriod | null;
};

const period = (v: unknown): RentPeriod | null => (v === "month" || v === "quarter" || v === "year" ? v : null);
const whole = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null;

export function parseBuildings(data: unknown): Building[] {
  if (!Array.isArray(data)) return [];
  const out: Building[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.listing_id !== "string") continue;
    out.push({
      listingId: r.listing_id,
      place: typeof r.place_name === "string" ? r.place_name : "",
      bedrooms: whole(r.bedrooms),
      status: typeof r.status === "string" ? r.status : "",
      letState: r.let_state === "let" ? "let" : "vacant",
      tenancyEndsOn: isDay(r.tenancy_ends_on) ? r.tenancy_ends_on : null,
      rentMinor: whole(r.achieved_rent_minor),
      rentPeriod: period(r.rent_period),
    });
  }
  return out;
}

export type UnitsSplit = {
  /** Let: a paid tenancy is running, or the listing was closed as let. */
  let: number;
  /** Live and not let: on the market and available. */
  vacant: number;
  /** Everything else: a draft, in review, sent back, rejected or suspended. */
  other: number;
  total: number;
};

const LIVE = new Set(["PUBLISHED", "APPROVED"]);

/** The units donut: let, live and vacant, and the rest. They always add up to the total. */
export function unitsSplit(buildings: readonly Building[]): UnitsSplit {
  let letCount = 0;
  let vacant = 0;
  let other = 0;
  for (const b of buildings) {
    if (b.letState === "let") letCount += 1;
    else if (LIVE.has(b.status)) vacant += 1;
    else other += 1;
  }
  return { let: letCount, vacant, other, total: buildings.length };
}

/** A rent charge opened for a tenant (`rent_payments`), read as the lister. */
export type Tenancy = {
  id: string;
  listingId: string;
  bookingId: string | null;
  moveIn: string;
  period: RentPeriod;
  rentMinor: number;
  totalMinor: number;
  /** Instant the charge was opened. */
  createdAt: string;
  /** The day the tenancy ends: move-in plus one rent period (`tenancyEnd`, twin of the SQL). */
  endsOn: string;
};

export function parseTenancies(data: unknown): Tenancy[] {
  if (!Array.isArray(data)) return [];
  const out: Tenancy[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const total = whole(r.total_minor);
    const rent = whole(r.rent_minor);
    if (typeof r.id !== "string" || typeof r.listing_id !== "string" || !isDay(r.move_in) || total === null || rent === null) continue;
    if (typeof r.created_at !== "string" || dayOfInstant(r.created_at) === null) continue;
    const p = period(r.rent_period) ?? "year";
    out.push({
      id: r.id,
      listingId: r.listing_id,
      bookingId: typeof r.booking_id === "string" ? r.booking_id : null,
      moveIn: r.move_in,
      period: p,
      rentMinor: rent,
      totalMinor: total,
      createdAt: r.created_at,
      endsOn: tenancyEnd(r.move_in, p),
    });
  }
  return out;
}

/** One row of `my_earnings_history`: a payment the caller was paid for, or a reversal of one. */
export type EarningRow = {
  kind: "earning" | "reversal";
  occurredAt: string;
  /** What the payer paid, in kobo; negative on a reversal. */
  grossMinor: number;
  status: string;
  bookingId: string | null;
};

export function parseEarnings(data: unknown): EarningRow[] {
  if (!Array.isArray(data)) return [];
  const out: EarningRow[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const gross = whole(r.gross_minor);
    if ((r.kind !== "earning" && r.kind !== "reversal") || gross === null) continue;
    if (typeof r.occurred_at !== "string" || dayOfInstant(r.occurred_at) === null) continue;
    out.push({
      kind: r.kind,
      occurredAt: r.occurred_at,
      grossMinor: gross,
      status: typeof r.status === "string" ? r.status : "",
      bookingId: typeof r.booking_id === "string" ? r.booking_id : null,
    });
  }
  return out;
}

/**
 * What the payers have paid in through Vallo for each booking, in kobo.
 * Settled payments count (status SUCCESSFUL) and reversals take away; a
 * booking never goes below zero. A refunded payment is not counted at all.
 */
export function paidByBooking(earnings: readonly EarningRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of earnings) {
    if (!e.bookingId) continue;
    const counts = e.kind === "earning" ? e.status === "SUCCESSFUL" : true;
    if (!counts) continue;
    out.set(e.bookingId, (out.get(e.bookingId) ?? 0) + e.grossMinor);
  }
  for (const [id, minor] of out) if (minor < 0) out.set(id, 0);
  return out;
}

export function paidMinorOf(tenancy: Tenancy, paid: ReadonlyMap<string, number>): number {
  return tenancy.bookingId ? (paid.get(tenancy.bookingId) ?? 0) : 0;
}

/** A tenancy is paid when what came in through Vallo covers its whole total. */
export function isPaid(tenancy: Tenancy, paid: ReadonlyMap<string, number>): boolean {
  return tenancy.totalMinor > 0 && paidMinorOf(tenancy, paid) >= tenancy.totalMinor;
}

export type RentMonth = {
  /** Charges opened this month (rent due). */
  billedMinor: number;
  /** Of those, what has been paid in so far, never more than was billed. */
  paidMinor: number;
  openedCount: number;
  paidCount: number;
};

/** Rent due this month: the charges opened in the Lagos month of `today`, and how much of them is paid. */
export function rentMonth(tenancies: readonly Tenancy[], paid: ReadonlyMap<string, number>, today: string): RentMonth {
  const month = monthKey(today);
  let billed = 0;
  let paidSum = 0;
  let opened = 0;
  let paidCount = 0;
  for (const t of tenancies) {
    if (monthKey(dayOfInstant(t.createdAt) ?? "") !== month) continue;
    opened += 1;
    billed += t.totalMinor;
    paidSum += Math.min(paidMinorOf(t, paid), t.totalMinor);
    if (isPaid(t, paid)) paidCount += 1;
  }
  return { billedMinor: billed, paidMinor: paidSum, openedCount: opened, paidCount };
}

/**
 * Rent paid in by month, in kobo, over the given months: settled payments to
 * this lister's rent bookings, by the Lagos month they were made. Months with
 * nothing in them are zero because the read covered them.
 */
export function rentPaidByMonth(
  earnings: readonly EarningRow[],
  rentBookings: ReadonlySet<string>,
  keys: readonly string[],
): number[] {
  const index = new Map(keys.map((key, i) => [key, i]));
  const out = keys.map(() => 0);
  for (const e of earnings) {
    if (e.kind !== "earning" || e.status !== "SUCCESSFUL" || !e.bookingId || !rentBookings.has(e.bookingId)) continue;
    const day = dayOfInstant(e.occurredAt);
    const at = day ? index.get(monthKey(day)) : undefined;
    if (at !== undefined) out[at]! += e.grossMinor;
  }
  return out;
}

export type TenancyRef = {
  id: string;
  listingId: string;
  place: string | null;
  endsOn: string;
  /** Days from today to the end (0 is today). */
  days: number;
  rentMinor: number;
  period: RentPeriod;
};

function refOf(t: Tenancy, today: string, places: ReadonlyMap<string, string>): TenancyRef {
  return {
    id: t.id,
    listingId: t.listingId,
    place: places.get(t.listingId) || null,
    endsOn: t.endsOn,
    days: daysBetween(today, t.endsOn),
    rentMinor: t.rentMinor,
    period: t.period,
  };
}

/** Paid tenancies that have not ended, soonest end first. */
export function runningTenancies(
  tenancies: readonly Tenancy[],
  paid: ReadonlyMap<string, number>,
  today: string,
  places: ReadonlyMap<string, string>,
): TenancyRef[] {
  return tenancies
    .filter((t) => isPaid(t, paid) && t.endsOn >= today)
    .map((t) => refOf(t, today, places))
    .sort((a, b) => a.endsOn.localeCompare(b.endsOn) || a.id.localeCompare(b.id));
}

/** Renewals: running tenancies ending tomorrow or within the next 90 days (today has its own card). */
export function renewalsWithin(running: readonly TenancyRef[], days = 90): TenancyRef[] {
  return running.filter((r) => r.days >= 1 && r.days <= days);
}

/** Leases that end today. */
export function leasesEndingToday(running: readonly TenancyRef[]): TenancyRef[] {
  return running.filter((r) => r.days === 0);
}

/** The next rent due: the earliest end of a running tenancy, which is when its rent falls due again. */
export function nextRentDue(running: readonly TenancyRef[]): TenancyRef | null {
  return running[0] ?? null;
}

/** An agreement waiting for the owner to confirm. */
export type AgreementWait = { id: string; listingId: string | null; kind: string; updatedAt: string };

/** Agreements that are open and where the owner has not confirmed the current terms. */
export function parseAgreementsWaiting(data: unknown): AgreementWait[] {
  if (!Array.isArray(data)) return [];
  const out: AgreementWait[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id !== "string" || r.status !== "awaiting_parties") continue;
    const terms = whole(r.terms_version);
    const confirmed = whole(r.owner_confirmed_version);
    if (terms === null || confirmed === terms) continue;
    out.push({
      id: r.id,
      listingId: typeof r.listing_id === "string" ? r.listing_id : null,
      kind: typeof r.kind === "string" ? r.kind : "",
      updatedAt: typeof r.updated_at === "string" ? r.updated_at : "",
    });
  }
  return out.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export type OwnerInputs = {
  buildings: Building[] | null;
  tenancies: Tenancy[] | null;
  earnings: EarningRow[] | null;
  visits: Visit[] | null;
  agreements: AgreementWait[] | null;
};

export type OwnerView = {
  units: UnitsSplit | null;
  /** Rent due this month and what is paid of it. Null when tenancies or payments could not be read. */
  rentMonth: RentMonth | null;
  /** Rent paid in by month, oldest first. Null when payments could not be read. */
  trend: { key: string; minor: number }[] | null;
  /** Everything paid in this Lagos month. Same source as the trend. */
  paidThisMonthMinor: number | null;
  leaseToday: TenancyRef[] | null;
  renewals: TenancyRef[] | null;
  nextDue: TenancyRef | null | undefined;
  visitsWeek: Visit[] | null;
  agreements: AgreementWait[] | null;
  /** The unit the property card shows: the soonest to end among those let, else the first unit. */
  property: Building | null;
  /** The rent booking the property card's tenancy link opens, when one is running. */
  propertyTenancyId: string | null;
};

/** Every owner figure, from what was read. Pure: an input that is null leaves its figures null. */
export function ownerView(input: OwnerInputs, now: Date, months = 6): OwnerView {
  const today = lagosDay(now);
  const keys = lastMonthKeys(today, months);
  const places = new Map((input.buildings ?? []).map((b) => [b.listingId, b.place] as const));
  const known = input.tenancies !== null && input.earnings !== null;
  const paid = known ? paidByBooking(input.earnings!) : null;
  const running = known && paid ? runningTenancies(input.tenancies!, paid, today, places) : null;
  const rentBookings = new Set((input.tenancies ?? []).flatMap((t) => (t.bookingId ? [t.bookingId] : [])));
  const series = known ? rentPaidByMonth(input.earnings!, rentBookings, keys) : null;

  let property: Building | null = null;
  let propertyTenancyId: string | null = null;
  if (input.buildings && input.buildings.length > 0) {
    const letUnits = input.buildings.filter((b) => b.letState === "let").sort((a, b) => (a.tenancyEndsOn ?? "9").localeCompare(b.tenancyEndsOn ?? "9"));
    property = letUnits[0] ?? input.buildings[0] ?? null;
    if (property && running) propertyTenancyId = running.find((r) => r.listingId === property!.listingId)?.id ?? null;
  }

  return {
    units: input.buildings ? unitsSplit(input.buildings) : null,
    rentMonth: known && paid ? rentMonth(input.tenancies!, paid, today) : null,
    trend: series ? keys.map((key, i) => ({ key, minor: series[i]! })) : null,
    paidThisMonthMinor: series ? series[series.length - 1]! : null,
    leaseToday: running ? leasesEndingToday(running) : null,
    renewals: running ? renewalsWithin(running) : null,
    nextDue: running ? nextRentDue(running.filter((r) => r.days >= 0)) : undefined,
    visitsWeek: input.visits ? visitsThisWeek(input.visits, now) : null,
    agreements: input.agreements,
    property,
    propertyTenancyId,
  };
}

/* ----------------------------------------------------------------- agent */

/** A listing enquiry thread, for the monthly chart and the featured listing. */
export type EnquiryRow = { listingId: string | null; createdAt: string };

export function parseEnquiries(data: unknown): EnquiryRow[] {
  if (!Array.isArray(data)) return [];
  const out: EnquiryRow[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.created_at !== "string" || dayOfInstant(r.created_at) === null) continue;
    out.push({ listingId: typeof r.listing_id === "string" ? r.listing_id : null, createdAt: r.created_at });
  }
  return out;
}

/** Enquiries opened in the last `days` days up to and including today (Lagos). */
export function enquiriesInLastDays(rows: readonly EnquiryRow[], now: Date, days: number): EnquiryRow[] {
  const from = addDays(lagosDay(now), -(days - 1));
  return rows.filter((r) => (dayOfInstant(r.createdAt) ?? "") >= from);
}

export type FeaturedPick = { listingId: string; enquiries: number };

/**
 * The listing to feature: of the live listings, the one with the most
 * enquiries in the last 30 days. A tie goes to the one named first (the
 * caller's order, newest first); with no enquiries on any live listing the
 * first live listing is shown with a count of nought. No live listing, none.
 */
export function pickFeatured(
  liveListingIds: readonly string[],
  enquiries: readonly EnquiryRow[],
  now: Date,
  days = 30,
): FeaturedPick | null {
  if (liveListingIds.length === 0) return null;
  const recent = enquiriesInLastDays(enquiries, now, days);
  const counts = new Map<string, number>();
  for (const r of recent) if (r.listingId) counts.set(r.listingId, (counts.get(r.listingId) ?? 0) + 1);
  let best: FeaturedPick = { listingId: liveListingIds[0]!, enquiries: counts.get(liveListingIds[0]!) ?? 0 };
  for (const id of liveListingIds) {
    const n = counts.get(id) ?? 0;
    if (n > best.enquiries) best = { listingId: id, enquiries: n };
  }
  return best;
}

export type MonthBar = { key: string; count: number };

/** Enquiries and visits by month over the last `months` months, oldest first. */
export function agentMonthly(
  enquiries: readonly EnquiryRow[] | null,
  visits: readonly Visit[] | null,
  today: string,
  months = 6,
): { enquiries: MonthBar[] | null; visits: MonthBar[] | null } {
  const keys = lastMonthKeys(today, months);
  const bars = (counts: number[]): MonthBar[] => keys.map((key, i) => ({ key, count: counts[i]! }));
  return {
    enquiries: enquiries ? bars(countByMonth(enquiries.map((e) => e.createdAt), keys)) : null,
    visits: visits ? bars(countByMonth(visits.map((v) => v.slotAt), keys)) : null,
  };
}

/** A series with no event at all in the window has nothing to draw. */
export function isBlank(bars: readonly MonthBar[] | null): boolean {
  return bars === null || bars.every((b) => b.count === 0);
}

export type ReminderKind = "followup" | "visit" | "expiring";

export type Reminder = {
  kind: ReminderKind;
  /** Where the chevron goes. */
  href: string;
  /** How many things the line stands for (follow-ups due, visits today, listings to confirm). */
  count: number;
  /** For a follow-up that is overdue, how many of the count are. */
  overdue?: number;
};

/**
 * The Reminder list, in the order an agent should work it: follow-ups that are
 * due (they carry a promise to a person), visits today, then listings that
 * need a "still available" answer. A line with nothing behind it is not drawn.
 * An input that could not be read leaves its line out, and `unread` says which,
 * so the screen can say that rather than "nothing needs you".
 */
export function reminders(input: {
  followupsDue: number | null;
  followupsOverdue?: number;
  visitsToday: number | null;
  expiring: number | null;
}): { items: Reminder[]; unread: ReminderKind[] } {
  const items: Reminder[] = [];
  const unread: ReminderKind[] = [];
  if (input.followupsDue === null) unread.push("followup");
  else if (input.followupsDue > 0) {
    items.push({
      kind: "followup",
      href: "/agent/messages?filter=due",
      count: input.followupsDue,
      ...(input.followupsOverdue ? { overdue: input.followupsOverdue } : {}),
    });
  }
  if (input.visitsToday === null) unread.push("visit");
  else if (input.visitsToday > 0) items.push({ kind: "visit", href: "/agent/inspections", count: input.visitsToday });
  if (input.expiring === null) unread.push("expiring");
  else if (input.expiring > 0) items.push({ kind: "expiring", href: "/agent/listings", count: input.expiring });
  return { items, unread };
}

/* -------------------------------------------------------------- contacts */

/** The slice of an inbox thread the contacts list needs. */
export type ContactThread = {
  id: string;
  counterpartName: string;
  counterpartId?: string | undefined;
  counterpartAvatarUrl?: string | null | undefined;
  listingTitle: string | null;
  lastAt: string;
  contextKind?: string | undefined;
};

/**
 * The people who wrote to this agent most recently about a listing: one entry
 * per person (their newest thread), newest first, at most `max`. A thread
 * about a stay or a table is not a listing enquiry and is left out.
 */
export function recentContacts(threads: readonly ContactThread[], max = 5): ContactThread[] {
  const newest = [...threads]
    .filter((t) => (t.contextKind ?? "listing") === "listing")
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  const seen = new Set<string>();
  const out: ContactThread[] = [];
  for (const t of newest) {
    const who = t.counterpartId ?? t.id;
    if (seen.has(who)) continue;
    seen.add(who);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
