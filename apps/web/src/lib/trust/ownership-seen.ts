import "server-only";

import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";

/**
 * "OWNERSHIP SEEN": the date a reviewer approved an owner's proof of
 * ownership, from `public.ownership_seen_at` / `listing_ownership_seen_at`
 * (pending migration 20261013120000). Derived only from the reviewers' own
 * decisions, so nothing here can award it.
 *
 * Any failure, including the functions not existing yet, answers null and
 * the mark is simply not drawn: an absent mark is never a claim.
 */

type Rpc = (fn: string, args: Record<string, string>) => PromiseLike<{ data: unknown; error: unknown }>;

async function call(fn: string, args: Record<string, string>): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const rpc = (supabase.rpc as unknown as Rpc).bind(supabase);
    const { data, error } = await rpc(fn, args);
    if (error || typeof data !== "string" || Number.isNaN(Date.parse(data))) return null;
    return data;
  } catch {
    return null;
  }
}

export function ownershipSeenFor(userId: string): Promise<string | null> {
  return call("ownership_seen_at", { p_user: userId });
}

export function ownershipSeenForListing(listingId: string): Promise<string | null> {
  return call("listing_ownership_seen_at", { p_listing: listingId });
}

/** The function's own cap: one shelf's worth of cards. */
const BATCH_CAP = 200;

type RpcRows = (fn: string, args: Record<string, string[]>) => PromiseLike<{ data: unknown; error: unknown }>;

/**
 * The same date for a page of search results in ONE read
 * (`public.listings_ownership_seen_at`, the batch twin of
 * `listing_ownership_seen_at`; draft in
 * supabase/migrations/pending/listings_ownership_seen_at_batch.sql). Only the
 * listings that carry the mark are in the map. Any failure, including the
 * function not existing yet, is an empty map: no card draws the mark.
 */
export async function ownershipSeenForListings(listingIds: readonly string[]): Promise<Map<string, string>> {
  const seen = new Map<string, string>();
  const ids = [...new Set(listingIds)].slice(0, BATCH_CAP);
  if (ids.length === 0 || !isSupabaseConfigured()) return seen;
  try {
    const supabase = await createClient();
    const rpc = (supabase.rpc as unknown as RpcRows).bind(supabase);
    const { data, error } = await rpc("listings_ownership_seen_at", { p_listings: ids });
    if (error || !Array.isArray(data)) return seen;
    for (const row of data as { listing_id?: unknown; seen_at?: unknown }[]) {
      if (typeof row.listing_id !== "string" || typeof row.seen_at !== "string") continue;
      if (Number.isNaN(Date.parse(row.seen_at))) continue;
      seen.set(row.listing_id, row.seen_at);
    }
    return seen;
  } catch {
    return seen;
  }
}
