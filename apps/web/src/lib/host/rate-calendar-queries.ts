import "server-only";

import { resolveSession } from "../actions/session";
import {
  addDays,
  firstOfMonth,
  lastOfMonth,
  rowKey,
  type CalendarRoom,
  type CalendarRows,
} from "./rate-calendar";

/**
 * THE READS BEHIND `/host/calendar` (C1), under the host's own session.
 *
 * Every table here already scopes to the owner by RLS (`rate_plans_select`,
 * `rate_calendar_select`, `room_inventory_select` all admit
 * `private.my_room_type_ids()`), so nothing restates who owns what. The
 * imported nights (C2) come from `calendar_import_nights`, which exists only
 * once the lead applies the calendar sync migration; until then that read
 * fails and the calendar simply shows no imported nights.
 */

export type CalendarRead =
  | { state: "signed-out" }
  | { state: "unavailable" }
  | { state: "ok"; rooms: CalendarRoom[]; rows: CalendarRows; sync: SyncState };

/** What the sync panel needs: whether the tables exist, and each room's feeds. */
export type SyncState = {
  /** False until the C2 migration is applied. */
  ready: boolean;
  feeds: { roomTypeId: string; token: string }[];
  imports: CalendarImport[];
};

export type CalendarImport = {
  id: string;
  roomTypeId: string;
  source: string;
  url: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  failures: number;
  nightsBlocked: number;
};

const SOURCE_LABEL: Record<string, string> = {
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  other: "Another site",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? "Another site";
}

type PlanRow = {
  id: string;
  name: string;
  rate_minor: number;
  active: boolean;
  room_type_id: string;
  min_stay_nights: number;
  max_stay_nights: number | null;
};
type RoomRow = { id: string; name: string; units_total: number; status: string; rate_plans: PlanRow[] | null };

/**
 * One property's room types with their plans, and every row the calendar
 * draws for the months asked (a margin of a week either side, so the grid's
 * leading and trailing days are real).
 */
export async function readRateCalendar(
  accommodationId: string,
  months: { from: string; to: string },
): Promise<CalendarRead> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { state: "signed-out" };
  const db = session.supabase;
  try {
    const { data, error } = await db
      .from("room_types")
      .select("id, name, units_total, status, rate_plans(id, name, rate_minor, active, room_type_id, min_stay_nights, max_stay_nights)")
      .eq("accommodation_id", accommodationId)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) return { state: "unavailable" };
    const roomRows = (data ?? []) as unknown as RoomRow[];
    const rooms: CalendarRoom[] = roomRows.map((room) => ({
      id: room.id,
      name: room.name,
      unitsTotal: room.units_total,
      status: room.status,
      plans: (room.rate_plans ?? [])
        .map((plan) => ({
          id: plan.id,
          name: plan.name,
          rateMinor: Number(plan.rate_minor),
          active: plan.active,
          minStayNights: plan.min_stay_nights,
          maxStayNights: plan.max_stay_nights,
        }))
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
    }));
    const rows: CalendarRows = { rates: new Map(), inventory: new Map(), imported: new Map() };
    const empty: SyncState = { ready: false, feeds: [], imports: [] };
    if (rooms.length === 0) return { state: "ok", rooms, rows, sync: empty };

    const from = addDays(firstOfMonth(months.from), -7);
    const to = addDays(lastOfMonth(months.to), 7);
    const roomIds = rooms.map((room) => room.id);
    const planIds = rooms.flatMap((room) => room.plans.map((plan) => plan.id));

    const [rates, inventory, sync] = await Promise.all([
      planIds.length
        ? db
            .from("rate_calendar")
            .select("rate_plan_id, date, rate_minor, closed")
            .in("rate_plan_id", planIds)
            .gte("date", from)
            .lte("date", to)
            .limit(20_000)
        : Promise.resolve({ data: [], error: null }),
      db
        .from("room_inventory")
        .select("room_type_id, date, units_open, units_booked")
        .in("room_type_id", roomIds)
        .gte("date", from)
        .lte("date", to)
        .limit(20_000),
      readSync(roomIds, from, to),
    ]);
    if (rates.error || inventory.error) return { state: "unavailable" };
    for (const r of (rates.data ?? []) as { rate_plan_id: string; date: string; rate_minor: number | null; closed: boolean }[]) {
      rows.rates.set(rowKey(r.rate_plan_id, r.date), {
        rateMinor: r.rate_minor === null ? null : Number(r.rate_minor),
        closed: r.closed,
      });
    }
    for (const r of (inventory.data ?? []) as { room_type_id: string; date: string; units_open: number; units_booked: number }[]) {
      rows.inventory.set(rowKey(r.room_type_id, r.date), { unitsOpen: r.units_open, unitsBooked: r.units_booked });
    }
    for (const [key, label] of sync.imported) rows.imported.set(key, label);
    return { state: "ok", rooms, rows, sync: sync.state };
  } catch {
    return { state: "unavailable" };
  }
}

/**
 * The C2 tables, read as untyped names because they are newer than the
 * generated types. Any error (the migration not yet applied is the expected
 * one) reads as "not ready", never as a broken page.
 */
async function readSync(
  roomIds: string[],
  from: string,
  to: string,
): Promise<{ state: SyncState; imported: Map<string, string> }> {
  const imported = new Map<string, string>();
  const notReady = { state: { ready: false, feeds: [], imports: [] }, imported };
  const session = await resolveSession();
  if (session.state !== "signed-in") return notReady;
  const db = session.supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        in: (col: string, values: string[]) => PromiseLike<{ data: unknown; error: unknown }> & {
          gte: (col: string, v: string) => { lte: (col: string, v: string) => PromiseLike<{ data: unknown; error: unknown }> };
        };
      };
    };
  };
  try {
    const [feeds, imports] = await Promise.all([
      db.from("calendar_feeds").select("room_type_id, token").in("room_type_id", roomIds),
      db
        .from("calendar_imports")
        .select("id, room_type_id, source, url, enabled, last_synced_at, last_error, failures, nights_blocked")
        .in("room_type_id", roomIds),
    ]);
    if (feeds.error || imports.error) return notReady;
    const importRows = (imports.data ?? []) as {
      id: string;
      room_type_id: string;
      source: string;
      url: string;
      enabled: boolean;
      last_synced_at: string | null;
      last_error: string | null;
      failures: number;
      nights_blocked: number;
    }[];
    const byImport = new Map(importRows.map((row) => [row.id, row]));
    if (importRows.length > 0) {
      const nights = await db
        .from("calendar_import_nights")
        .select("import_id, date")
        .in(
          "import_id",
          importRows.map((row) => row.id),
        )
        .gte("date", from)
        .lte("date", to);
      if (!nights.error) {
        for (const night of (nights.data ?? []) as { import_id: string; date: string }[]) {
          const source = byImport.get(night.import_id);
          if (source) imported.set(rowKey(source.room_type_id, night.date), sourceLabel(source.source));
        }
      }
    }
    return {
      state: {
        ready: true,
        feeds: ((feeds.data ?? []) as { room_type_id: string; token: string }[]).map((f) => ({
          roomTypeId: f.room_type_id,
          token: f.token,
        })),
        imports: importRows.map((row) => ({
          id: row.id,
          roomTypeId: row.room_type_id,
          source: row.source,
          url: row.url,
          enabled: row.enabled,
          lastSyncedAt: row.last_synced_at,
          lastError: row.last_error,
          failures: row.failures,
          nightsBlocked: row.nights_blocked,
        })),
      },
      imported,
    };
  } catch {
    return notReady;
  }
}
