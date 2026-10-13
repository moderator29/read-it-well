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
