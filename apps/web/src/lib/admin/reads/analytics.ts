import "server-only";

import { rangeBuckets } from "./overview";
import type { BookingOutcomes, CollectedRange, ThinAreas } from "./shapes";
import { UNAVAILABLE, adminReader, bucketSum, exactCount, lagosDay, readAll, type Read } from "./shared";

/**
 * THE ANALYTICS DESK'S READS (01F7DFC7 panel three).
 *
 * WHAT THE DATABASE CAN ANSWER TODAY: bookings that went through, new supply
 * over time, and where supply is thin. WHAT IT CANNOT: searches, listing
 * views and refusal reasons are not recorded anywhere, so demand, top areas
 * by searches, searches against results, conversion and common refusals have
 * no source. Those panels say so and name their requests (A7, A8, A11 in
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
