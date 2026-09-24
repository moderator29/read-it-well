import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";

/**
 * THE SHARED GROUND UNDER EVERY CONSOLE READ in `lib/admin/reads/`.
 *
 * READ ONLY, AND THROUGH THE CALLER'S OWN SESSION. `adminReader` returns the
 * signed-in operator's client from `requireAdmin`, never the service role, so
 * row level security decides what comes back: the admin SELECT policies on
 * listings, profiles, transactions, wallet_entries, audit_log, risk_alerts,
 * agents, agent_applications and bookings (checked in `pg_policies` on 22
 * September). A read the policies do not allow comes back empty or errors,
 * and the console says so; it is never widened here.
 *
 * NO CAP MAKES A TOTAL LIE. A total is an exact count (`count: "exact",
 * head: true`). Where a chart needs the rows themselves (timestamps to bucket
 * by day), `readAll` pages through every row in the window and refuses,
 * returning null, past `READ_ALL_LIMIT` rather than returning a prefix that
 * would draw as a smaller truth.
 *
 * TIME IS LAGOS TIME. Africa/Lagos is UTC+1 all year (no daylight saving),
 * so a Lagos day is a fixed one hour offset from UTC and is computed here
 * without a timezone library.
 */

export type Read<T> = { state: "ok"; data: T } | { state: "unavailable" };
export const UNAVAILABLE = { state: "unavailable" } as const;

export type AdminReader = SupabaseClient<Database>;

/** The operator's own client, or null when the caller is not staff. */
export async function adminReader(): Promise<AdminReader | null> {
  const access = await requireAdmin();
  return access.state === "admin" ? access.supabase : null;
}

export const LAGOS_OFFSET_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/** The Lagos calendar day of an instant, `YYYY-MM-DD`. */
export function lagosDay(at: string | number | Date): string {
  const ms = typeof at === "number" ? at : typeof at === "string" ? Date.parse(at) : at.getTime();
  return new Date(ms + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** The Lagos calendar month of an instant, `YYYY-MM`. */
export function lagosMonth(at: string | number | Date): string {
  return lagosDay(at).slice(0, 7);
}

/** The instant a Lagos day begins, as an ISO string PostgREST accepts. */
export function lagosDayStartIso(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - LAGOS_OFFSET_MS).toISOString();
}

/** The instant a Lagos day ends (exclusive: the next day's start). */
export function lagosDayEndIso(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - LAGOS_OFFSET_MS + DAY_MS).toISOString();
}

/** The last `n` Lagos days ending today, oldest first. */
export function lastDays(n: number, now: number): string[] {
  const today = Date.parse(`${lagosDay(now)}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(today - (n - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

/** The last `n` Lagos months ending this month, oldest first. */
export function lastMonths(n: number, now: number): string[] {
  const [y, m] = lagosMonth(now).split("-").map(Number) as [number, number];
  return Array.from({ length: n }, (_, i) => {
    const index = y * 12 + (m - 1) - (n - 1 - i);
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

/** The first instant of a Lagos month, as an ISO string. */
export function lagosMonthStartIso(month: string): string {
  return lagosDayStartIso(`${month}-01`);
}

/**
 * Seven-day buckets ending today, oldest first: each is the day it starts
 * on. `n` buckets cover `7n` days.
 */
export function lastWeeks(n: number, now: number): string[] {
  const days = lastDays(n * 7, now);
  return Array.from({ length: n }, (_, i) => days[i * 7]!);
}

/**
 * Put each dated value into the bucket it belongs to. `keys` are the bucket
 * starts, ascending; a value lands in the last bucket whose start is at or
 * before its own key. Values before the first bucket are dropped. Every
 * bucket is returned, zeros included, so a quiet day is drawn as zero and not
 * skipped.
 */
export function bucketSum(
  values: readonly { key: string; amount: number }[],
  keys: readonly string[],
): number[] {
  const sums = keys.map(() => 0);
  for (const value of values) {
    let slot = -1;
    for (let i = keys.length - 1; i >= 0; i -= 1) {
      if (value.key >= keys[i]!) {
        slot = i;
        break;
      }
    }
    if (slot >= 0) sums[slot] = sums[slot]! + value.amount;
  }
  return sums;
}

export const READ_ALL_LIMIT = 50_000;
const PAGE = 1000;

/**
 * Every row a paged query returns, or null if a page failed or the window
 * holds more than `READ_ALL_LIMIT` rows. `page(from, to)` must apply a stable
 * order so pages do not overlap.
 */
export async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  limit = READ_ALL_LIMIT,
): Promise<T[] | null> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error || !data) return null;
    rows.push(...data);
    if (data.length < PAGE) return rows;
    if (rows.length >= limit) return null;
  }
}

/** An exact count from a `head: true, count: "exact"` query, or null. */
export async function exactCount(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number | null> {
  try {
    const { count, error } = await query;
    return error || count === null ? null : count;
  } catch {
    return null;
  }
}

/** Resolves every count or returns null if any failed, so a panel never mixes. */
export async function allCounts<K extends string>(
  queries: Record<K, PromiseLike<{ count: number | null; error: unknown }>>,
): Promise<Record<K, number> | null> {
  const keys = Object.keys(queries) as K[];
  const values = await Promise.all(keys.map((k) => exactCount(queries[k])));
  if (values.some((v) => v === null)) return null;
  return Object.fromEntries(keys.map((k, i) => [k, values[i]!])) as Record<K, number>;
}

/** A person's published badge tier, exactly as `public.person_badge` gives it. Never computed here. */
import type { PersonTier } from "./shapes";
export type { PersonTier };

/** The pure half of `getPersonTiers`: rows into a map, anything but gold or platinum dropped. Tested. */
export function tierMap(rows: readonly { user_id: string | null; tier: string | null }[]): Map<string, PersonTier> {
  const out = new Map<string, PersonTier>();
  for (const row of rows) {
    if (row.user_id && (row.tier === "gold" || row.tier === "platinum")) out.set(row.user_id, row.tier);
  }
  return out;
}

/**
 * THE BADGE. The console reads each named
 * person's tier from `public.person_badge`, the one published source (SELECT
 * granted to authenticated), through the operator's own session, and hands
 * it to the shared slot `app/admin/_components/PersonTier.tsx`. An absent row means no
 * badge. Nothing here derives a tier. The view is not in the generated types
 * yet, so it is reached through an untyped view of the same client. A failed
 * read returns an empty map: the failure direction is a badge that does not
 * appear, never one that appears wrongly.
 */
export async function getPersonTiers(userIds: readonly (string | null | undefined)[]): Promise<Map<string, PersonTier>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();
  const db = await adminReader();
  if (!db) return new Map();
  try {
    const loose = db as unknown as SupabaseClient;
    const rows: { user_id: string | null; tier: string | null }[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await loose.from("person_badge").select("user_id, tier").in("user_id", ids.slice(i, i + 200));
      if (error) return new Map();
      rows.push(...((data ?? []) as { user_id: string | null; tier: string | null }[]));
    }
    return tierMap(rows);
  } catch {
    return new Map();
  }
}

/* THE QA ACCOUNTS live in `./shapes` (no server-only import) so a page can
   label a row with `isQaAccount`; the statistics' filter is re-exported here. */
export { QA_ACCOUNT_IDS, QA_NOT_IN, isQaAccount, withoutQa } from "./shapes";
