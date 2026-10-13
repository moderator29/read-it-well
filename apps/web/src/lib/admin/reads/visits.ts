import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InspectionState } from "@/lib/inspections/types";
import { lagosDayStartIso, rangeOf, shiftDay, visitModeFrom } from "@/lib/visit-calendar/model";
import { adminReader, readAll, UNAVAILABLE, type Read } from "./shared";
import {
  narrowVisits,
  type AdminVisitQuery,
  type AdminVisitRow,
  type NoShowRecord,
  type ReminderRecord,
} from "./visits-model";

export * from "./visits-model";

/**
 * THE CONSOLE'S VISIT CALENDAR (Bookings > Visits, `/admin/bookings/visits`).
 *
 * READ ONLY, THROUGH `adminReader("operations")`: an admin reads on their own
 * RLS-bound client (`inspection_requests_select_admin`, the admin read
 * policies on profiles and listings, `inspection_no_shows_select_admin`);
 * a staff member holding the operations scope reads on the service client
 * `requireAdmin` hands out only after the scope is proved. Nothing here
 * writes.
 *
 * LEAST PRIVILEGE IN WHAT IS READ, not only in who reads it: the listing's
 * title, city and area; the two people's DISPLAY NAMES and nothing else from
 * their account (no email, no phone); the state timestamps; the reminder
 * ledger's stage and time; the no-show's who, when and outcome, without the
 * dispute note, which is the member's own words. No message is read.
 *
 * NO CAP MAKES A TOTAL LIE. The range is read whole with `readAll`, up to
 * `VISIT_READ_LIMIT`; past it the read refuses (`tooMany`) rather than draw a
 * prefix as the month. Filters are applied after the read so the city and
 * lister choices always list everything in the range.
 */

export const VISIT_READ_LIMIT = 5_000;

const COLUMNS =
  "id, listing_id, requester_id, lister_id, state, requested_at, slot_at, created_at, responded_at, confirmed_at, completed_at, visit_mode, outcome, listings ( title, city, area )";

type Raw = {
  id: string;
  listing_id: string;
  requester_id: string;
  lister_id: string;
  state: InspectionState;
  requested_at: string;
  slot_at: string | null;
  created_at: string;
  responded_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  visit_mode: string | null;
  outcome: string | null;
  listings: { title: string | null; city: string | null; area: string | null } | { title: string | null; city: string | null; area: string | null }[] | null;
};

export type VisitCalendarData = {
  /** Every visit in the drawn range that passes the filters. */
  rows: AdminVisitRow[];
  /** How many visits the range holds before the filters. */
  inRange: number;
  cities: string[];
  listers: { id: string; name: string }[];
};

export type VisitCalendarRead = Read<VisitCalendarData> | { state: "too-many" };

async function displayNames(db: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const wanted = [...new Set(ids)];
  for (let i = 0; i < wanted.length; i += 200) {
    const { data } = await db.from("profiles").select("id, display_name").in("id", wanted.slice(i, i + 200));
    for (const row of (data ?? []) as { id: string; display_name: string | null }[]) {
      const name = (row.display_name ?? "").trim();
      if (name) out.set(row.id, name);
    }
  }
  return out;
}

export async function getVisitCalendar(query: AdminVisitQuery): Promise<VisitCalendarRead> {
  const reader = await adminReader("operations");
  if (!reader) return UNAVAILABLE;
  const db = reader as unknown as SupabaseClient;
  const { from, to } = rangeOf(query.view, query.day);
  const start = lagosDayStartIso(from);
  const end = lagosDayStartIso(shiftDay(to, 1));
  try {
    const raw = await readAll<Raw>(
      (lo, hi) =>
        db
          .from("inspection_requests")
          .select(COLUMNS)
          .or(
            `and(slot_at.gte."${start}",slot_at.lt."${end}"),and(slot_at.is.null,requested_at.gte."${start}",requested_at.lt."${end}")`,
          )
          .order("id", { ascending: true })
          .range(lo, hi) as unknown as PromiseLike<{ data: Raw[] | null; error: unknown }>,
      VISIT_READ_LIMIT,
    );
    if (raw === null) {
      /* readAll returns null for a failed page AND for a range past the limit;
         a quick count tells them apart so the operator is told the right one. */
      const { count, error } = await db
        .from("inspection_requests")
        .select("id", { count: "exact", head: true })
        .or(
          `and(slot_at.gte."${start}",slot_at.lt."${end}"),and(slot_at.is.null,requested_at.gte."${start}",requested_at.lt."${end}")`,
        );
      return !error && (count ?? 0) > VISIT_READ_LIMIT ? { state: "too-many" } : UNAVAILABLE;
    }
    const names = await displayNames(
      db,
      raw.flatMap((row) => [row.lister_id, row.requester_id]),
    );
    const all: AdminVisitRow[] = raw.map((row) => {
      const listing = Array.isArray(row.listings) ? (row.listings[0] ?? null) : row.listings;
      return {
        id: row.id,
        listingId: row.listing_id,
        listingTitle: listing?.title?.trim() || null,
        city: listing?.city?.trim() || null,
        area: listing?.area?.trim() || null,
        listerId: row.lister_id,
        listerName: names.get(row.lister_id) ?? null,
        renterId: row.requester_id,
        renterName: names.get(row.requester_id) ?? null,
        state: row.state,
        mode: visitModeFrom(row.visit_mode),
        at: row.slot_at ?? row.requested_at,
        asked: row.slot_at === null,
        requestedAt: row.requested_at,
        slotAt: row.slot_at,
        createdAt: row.created_at,
        respondedAt: row.responded_at,
        confirmedAt: row.confirmed_at,
        completedAt: row.completed_at,
        outcome: row.outcome,
      };
    });
    const cities = [...new Set(all.map((row) => row.city).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));
    const listerMap = new Map<string, string>();
    for (const row of all) listerMap.set(row.listerId, row.listerName ?? "");
    const listers = [...listerMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => (a.name || "~").localeCompare(b.name || "~") || a.id.localeCompare(b.id));
    return { state: "ok", data: { rows: narrowVisits(all, query), inRange: all.length, cities, listers } };
  } catch {
    return UNAVAILABLE;
  }
}

export type VisitDetail = {
  /** Null when the ledger cannot be read (its admin read policy is still a pending migration). */
  reminders: ReminderRecord[] | null;
  /** Null when the no-show records could not be read. */
  noShows: NoShowRecord[] | null;
};

/** The reminders sent and the no-shows reported for one visit. */
export async function getVisitDetail(id: string): Promise<Read<VisitDetail>> {
  const reader = await adminReader("operations");
  if (!reader) return UNAVAILABLE;
  const db = reader as unknown as SupabaseClient;
  const [reminders, noShows] = await Promise.all([
    db
      .from("viewing_reminders")
      .select("audience, stage, slot_at, sent_at")
      .eq("inspection_id", id)
      .order("sent_at", { ascending: true })
      .then(
        ({ data, error }) => (error ? null : ((data ?? []) as { audience: string; stage: string; slot_at: string; sent_at: string }[])),
        () => null,
      ),
    db
      .from("inspection_no_shows")
      .select("absent_role, reported_at, disputed_at, resolved_at, resolution")
      .eq("inspection_id", id)
      .order("reported_at", { ascending: true })
      .then(
        ({ data, error }) =>
          error
            ? null
            : ((data ?? []) as {
                absent_role: string;
                reported_at: string;
                disputed_at: string | null;
                resolved_at: string | null;
                resolution: string | null;
              }[]),
        () => null,
      ),
  ]);
  return {
    state: "ok",
    data: {
      reminders:
        reminders === null
          ? null
          : reminders
              .filter((r) => (r.audience === "renter" || r.audience === "lister") && (r.stage === "eve" || r.stage === "morning" || r.stage === "soon"))
              .map((r) => ({
                audience: r.audience as ReminderRecord["audience"],
                stage: r.stage as ReminderRecord["stage"],
                slotAt: r.slot_at,
                sentAt: r.sent_at,
              })),
      noShows:
        noShows === null
          ? null
          : noShows.map((n) => ({
              absentRole: n.absent_role === "lister" ? "lister" : "requester",
              reportedAt: n.reported_at,
              disputedAt: n.disputed_at,
              resolvedAt: n.resolved_at,
              resolution: n.resolution === "upheld" || n.resolution === "overturned" ? n.resolution : null,
            })),
    },
  };
}
