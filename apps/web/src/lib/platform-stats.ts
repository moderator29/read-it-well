import "server-only";

import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

/**
 * Platform counts shown on the public landing page.
 *
 * This module used to return null on purpose, because the only alternative at
 * the time was publishing the mockup's invented figures. The numbers band went
 * ahead and hardcoded "Listings 17+" and "Cities 6" anyway, which were the size
 * of the seed catalogue and not a claim the platform could stand behind.
 *
 * Now there is a third option: ask the database. `public.platform_stats()` is a
 * security-definer aggregate that counts PUBLISHED listings, the distinct
 * cities and states they sit in, and APPROVED agents. It returns four integers
 * and never a row, so an anonymous visitor learns nothing the search page would
 * not already tell them.
 *
 * Zero is a real answer and is reported as zero. The band decides what to do
 * with it; the honest reading of "we have published nothing yet" is to say
 * nothing about inventory, not to round it up.
 *
 * Cached in process for five minutes. A marketing count does not need to be
 * accurate to the second, and the landing page is the most-hit route we have.
 */

export type PlatformStats = {
  /** Published listings anyone can find through search. */
  listings: number;
  /** Distinct settlements those listings sit in. */
  cities: number;
  /** Distinct states those listings sit in. */
  states: number;
  /** Agents who passed verification. */
  agents: number;
};

const TTL_MS = 300_000;

let cache: { value: PlatformStats | null; expires: number } | null = null;

function toCount(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Real counts, or null when the platform cannot answer (no envs, database
 * unreachable). Null means "we do not know", which the band renders as
 * silence. It never means zero.
 */
export async function getPlatformStats(): Promise<PlatformStats | null> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.value;

  let value: PlatformStats | null = null;
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("platform_stats");
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row) {
        value = {
          listings: toCount(row.listings),
          cities: toCount(row.cities),
          states: toCount(row.states),
          agents: toCount(row.agents),
        };
      }
    } catch {
      value = null;
    }
  }

  cache = { value, expires: now + TTL_MS };
  return value;
}
