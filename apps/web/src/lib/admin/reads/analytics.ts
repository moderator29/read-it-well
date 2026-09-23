import "server-only";

import { rangeBuckets } from "./overview";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookingOutcomes, CollectedRange, PriceCheckDemand, ThinAreas } from "./shapes";
import { UNAVAILABLE, adminReader, bucketSum, exactCount, lagosDay, readAll, type Read } from "./shared";

/**
 * THE ANALYTICS DESK'S READS (01F7DFC7 panel three).
 *
 * WHAT THE DATABASE CAN ANSWER TODAY: bookings that went through, new supply
 * over time, where supply is thin, and demand as price checks: every check
 * submitted and every answer or refusal, from `price_check_events` (the
 * platform's first demand log, readable under `price_check_events_admin_read`).
 * WHAT IT CANNOT: site searches and listing views are not recorded, and a
 * decline of an inspection or reservation carries no reason, so those panels
 * say so and name their requests (A7 for searches, A8, A11 for declines in
 * docs/SESSION_B_SCOPE.md); nothing here estimates them.
 *
 * Examples (`is_demo`) are excluded from every supply figure.
 */

const WINDOW_DAYS: Record<CollectedRange, number> = { "30d": 30, "90d": 91, "12m": 365 };

/**
 * Bookings that went through (confirmed or completed) created in the range,
 * and in the same length of time before it. Exact counts.
 */
export async function getBookingOutcomes(range: CollectedRange, now: number): Promise<Read<BookingOutcomes>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const span = WINDOW_DAYS[range] * 86_400_000;
    const from = new Date(now - span).toISOString();
    const before = new Date(now - 2 * span).toISOString();
    const q = () =>
      db.from("bookings").select("id", { count: "exact", head: true }).in("status", ["CONFIRMED", "COMPLETED"]);
    const [successful, successfulPrev] = await Promise.all([
      exactCount(q().gte("created_at", from)),
      exactCount(q().gte("created_at", before).lt("created_at", from)),
    ]);
    if (successful === null || successfulPrev === null) return UNAVAILABLE;
    return { state: "ok", data: { successful, successfulPrev } };
  } catch {
    return UNAVAILABLE;
  }
}

/** New listings (examples excluded) per bucket of the range, for the supply line. */
export async function getSupplySeries(
  range: CollectedRange,
  now: number,
): Promise<Read<{ start: string; listings: number }[]>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const { keys, fromIso, monthly } = rangeBuckets(range, now);
    const rows = await readAll<{ created_at: string }>((from, to) =>
      db
        .from("listings")
        .select("created_at")
        .eq("is_demo", false)
        .gte("created_at", fromIso)
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (!rows) return UNAVAILABLE;
    const counts = bucketSum(
      rows.map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
      keys,
    );
    return {
      state: "ok",
      data: keys.map((key, i) => ({ start: monthly ? key.slice(0, 7) : key, listings: counts[i] ?? 0 })),
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** Group live listings by area, fewest first, ties by name. */
export function thinnest(
  rows: readonly { area: string | null; city: string | null }[],
  limit: number,
): ThinAreas["rows"] {
  const byArea = new Map<string, { area: string; city: string | null; count: number }>();
  for (const row of rows) {
    const area = (row.area ?? "").trim();
    if (area.length === 0) continue;
    const key = `${area.toLowerCase()}|${(row.city ?? "").trim().toLowerCase()}`;
    const hit = byArea.get(key);
    if (hit) hit.count += 1;
    else byArea.set(key, { area, city: row.city?.trim() || null, count: 1 });
  }
  return [...byArea.values()]
    .sort((a, b) => a.count - b.count || a.area.localeCompare(b.area))
    .slice(0, limit);
}

/**
 * The areas with the fewest live listings (examples excluded). Only areas
 * that have at least one listing can appear: an area with none is not in any
 * table the platform keeps, which the panel says.
 */
export async function getThinAreas(limit = 5): Promise<Read<ThinAreas>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const rows = await readAll<{ area: string | null; city: string | null }>((from, to) =>
      db
        .from("listings")
        .select("area, city")
        .eq("status", "PUBLISHED")
        .eq("is_demo", false)
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (!rows) return UNAVAILABLE;
    return { state: "ok", data: { rows: thinnest(rows, limit) } };
  } catch {
    return UNAVAILABLE;
  }
}

type CheckRow = { stage: string; outcome: string | null; refusal_code: string | null; state_code: string | null; lga_code: string | null; created_at: string };

/** The pure half: rows of one window into the demand panels. Tested. */
export function assembleDemand(
  keys: readonly string[],
  monthly: boolean,
  rows: readonly CheckRow[],
  names: ReadonlyMap<string, string>,
  checksPrev: number,
): PriceCheckDemand {
  const submitted = rows.filter((r) => r.stage === "submit");
  const outcomes = rows.filter((r) => r.stage === "outcome");
  const answeredRows = outcomes.filter((r) => r.outcome === "answered");
  const refusedRows = outcomes.filter((r) => r.outcome === "refused");
  const perBucket = (list: readonly CheckRow[]) =>
    bucketSum(
      list.map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
      keys,
    );
  const checks = perBucket(submitted);
  const answered = perBucket(answeredRows);
  const byArea = new Map<string, { area: string; state: string | null; checks: number }>();
  for (const row of submitted) {
    if (!row.lga_code) continue;
    const hit = byArea.get(row.lga_code);
    if (hit) hit.checks += 1;
    else byArea.set(row.lga_code, { area: names.get(row.lga_code) ?? row.lga_code, state: row.state_code, checks: 1 });
  }
  const byCode = new Map<string, number>();
  for (const row of refusedRows) {
    const code = row.refusal_code ?? "unrecorded";
    byCode.set(code, (byCode.get(code) ?? 0) + 1);
  }
  return {
    buckets: keys.map((key, i) => ({ start: monthly ? key.slice(0, 7) : key, checks: checks[i] ?? 0, answered: answered[i] ?? 0 })),
    checks: submitted.length,
    checksPrev,
    answered: answeredRows.length,
    refused: refusedRows.length,
    topAreas: [...byArea.values()].sort((a, b) => b.checks - a.checks || a.area.localeCompare(b.area)).slice(0, 5),
    refusals: [...byCode.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count).slice(0, 6),
  };
}

/**
 * Price checks in the range: every submitted check and every outcome, paged
 * whole (never a prefix), and the submitted count for the window before it.
 * `price_check_events` is not in the generated types yet, so the table is
 * reached through an untyped view of the same session client; the columns
 * read are the ones its migration declares.
 */
export async function getPriceCheckDemand(range: CollectedRange, now: number): Promise<Read<PriceCheckDemand>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const { keys, fromIso, monthly } = rangeBuckets(range, now);
    const loose = db as unknown as SupabaseClient;
    const rows = await readAll<CheckRow>((from, to) =>
      loose
        .from("price_check_events")
        .select("stage, outcome, refusal_code, state_code, lga_code, created_at")
        .in("stage", ["submit", "outcome"])
        .gte("created_at", fromIso)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    const span = now - Date.parse(fromIso);
    const checksPrev = await exactCount(
      loose
        .from("price_check_events")
        .select("id", { count: "exact", head: true })
        .eq("stage", "submit")
        .gte("created_at", new Date(Date.parse(fromIso) - span).toISOString())
        .lt("created_at", fromIso),
    );
    if (!rows || checksPrev === null) return UNAVAILABLE;
    const codes = [...new Set(rows.map((r) => r.lga_code).filter((c): c is string => Boolean(c)))];
    const names = new Map<string, string>();
    // Every area named, in slices a URL can carry; an unnamed code shows as itself.
    for (let i = 0; i < codes.length; i += 200) {
      const { data } = await db.from("local_governments").select("code, name").in("code", codes.slice(i, i + 200));
      for (const row of data ?? []) names.set(row.code, row.name);
    }
    return { state: "ok", data: assembleDemand(keys, monthly, rows, names, checksPrev) };
  } catch {
    return UNAVAILABLE;
  }
}
