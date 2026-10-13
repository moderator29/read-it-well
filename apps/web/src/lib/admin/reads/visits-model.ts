import type { InspectionState } from "@/lib/inspections/types";
import {
  filterOf,
  groupByDay,
  isDay,
  isVisitFilter,
  viewFrom,
  type VisitFilter,
  type VisitMode,
} from "@/lib/visit-calendar/model";

/**
 * THE PURE HALF OF THE CONSOLE'S VISIT CALENDAR (`visits.ts` reads; this
 * decides). The address is the state of the desk: the view, the day it is
 * anchored on, the four filters and the open visit all live in the query
 * string, so a link to "video visits in Abuja the week of 12 October, this
 * one open" is a link, and Back walks the operator's own steps.
 */

export type AdminVisitRow = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  city: string | null;
  area: string | null;
  listerId: string;
  /** The lister's display name, or null when they have none. Nothing else from their account. */
  listerName: string | null;
  renterId: string;
  renterName: string | null;
  state: InspectionState;
  mode: VisitMode;
  /** Where the visit sits: the agreed time, or the asked time until one is agreed. */
  at: string;
  asked: boolean;
  requestedAt: string;
  slotAt: string | null;
  createdAt: string;
  respondedAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  outcome: string | null;
};

export type ReminderRecord = {
  audience: "renter" | "lister";
  stage: "eve" | "morning" | "soon";
  slotAt: string;
  sentAt: string;
};

export type NoShowRecord = {
  absentRole: "requester" | "lister";
  reportedAt: string;
  disputedAt: string | null;
  resolvedAt: string | null;
  resolution: "upheld" | "overturned" | null;
};

export type AdminVisitQuery = {
  view: "week" | "month";
  /** The Lagos day the view is anchored on and, unless another is picked, the day listed. */
  day: string;
  state: VisitFilter | null;
  mode: VisitMode | null;
  city: string | null;
  lister: string | null;
  /** The visit whose detail is open. */
  visit: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The desk's state from its address; anything malformed is dropped, never trusted. */
export function readVisitQuery(params: Record<string, string | string[] | undefined>, today: string): AdminVisitQuery {
  const day = one(params.day);
  const state = one(params.state);
  const mode = one(params.mode);
  const city = (one(params.city) ?? "").trim().slice(0, 80);
  const lister = one(params.lister);
  const visit = one(params.visit);
  return {
    view: viewFrom(one(params.view)),
    day: isDay(day) ? day : today,
    state: isVisitFilter(state) ? state : null,
    mode: mode === "video" || mode === "in_person" ? mode : null,
    city: city.length > 0 ? city : null,
    lister: lister && UUID.test(lister) ? lister : null,
    visit: visit && UUID.test(visit) ? visit : null,
  };
}

/** True when a filter narrows the desk (the view, the day and the open visit do not). */
export function isNarrowed(query: AdminVisitQuery): boolean {
  return query.state !== null || query.mode !== null || query.city !== null || query.lister !== null;
}

/** The address of the desk with some of its state changed. Defaults are left out. */
export function visitsHref(base: string, query: AdminVisitQuery, patch: Partial<AdminVisitQuery> = {}): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.view !== "week") params.set("view", next.view);
  params.set("day", next.day);
  if (next.state) params.set("state", next.state);
  if (next.mode) params.set("mode", next.mode);
  if (next.city) params.set("city", next.city);
  if (next.lister) params.set("lister", next.lister);
  if (next.visit) params.set("visit", next.visit);
  return `${base}?${params.toString()}`;
}

/** The visits a query's filters keep. */
export function narrowVisits(rows: readonly AdminVisitRow[], query: AdminVisitQuery): AdminVisitRow[] {
  return rows.filter(
    (row) =>
      (query.state === null || filterOf(row.state) === query.state) &&
      (query.mode === null || row.mode === query.mode) &&
      (query.city === null || (row.city ?? "").toLowerCase() === query.city.toLowerCase()) &&
      (query.lister === null || row.listerId === query.lister),
  );
}

/** How many visits sit on each Lagos day. */
export function dayCounts(rows: readonly AdminVisitRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const [day, list] of groupByDay(rows)) out.set(day, list.length);
  return out;
}

export type HistoryKey =
  | "requested"
  | "answered"
  | "confirmed"
  | "done"
  | "noShowReported"
  | "noShowDisputed"
  | "noShowResolved";

export type HistoryStep = { key: HistoryKey; at: string };

/**
 * A visit's history, from the timestamps the record keeps, oldest first. Only
 * what was stamped is drawn: `responded_at` is the lister's answer (a new
 * time, a confirm or a decline), `confirmed_at` the moment it was agreed
 * (stamped again on a reschedule, so it is the latest agreement),
 * `completed_at` the moment it was recorded as done, and the no-show's own
 * three times. Nothing is inferred.
 */
export function historyOf(row: AdminVisitRow, noShows: readonly NoShowRecord[] | null): HistoryStep[] {
  const steps: HistoryStep[] = [{ key: "requested", at: row.createdAt }];
  if (row.respondedAt) steps.push({ key: "answered", at: row.respondedAt });
  if (row.confirmedAt) steps.push({ key: "confirmed", at: row.confirmedAt });
  if (row.completedAt) steps.push({ key: "done", at: row.completedAt });
  for (const record of noShows ?? []) {
    steps.push({ key: "noShowReported", at: record.reportedAt });
    if (record.disputedAt) steps.push({ key: "noShowDisputed", at: record.disputedAt });
    if (record.resolvedAt) steps.push({ key: "noShowResolved", at: record.resolvedAt });
  }
  const order: HistoryKey[] = ["requested", "answered", "confirmed", "done", "noShowReported", "noShowDisputed", "noShowResolved"];
  return steps.sort((a, b) => a.at.localeCompare(b.at) || order.indexOf(a.key) - order.indexOf(b.key));
}
