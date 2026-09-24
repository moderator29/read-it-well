import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { memo } from "../cache/memo";
import type { Database } from "../supabase/database.types";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase/env";
import { SupabaseListingRepository } from "./supabase-repository";
import type { Listing } from "./types";

/**
 * OPS-11: THE LANDING PAGE'S CATALOGUE, READ ONCE PER FIVE MINUTES.
 *
 * The landing page is the one page every stranger opens, and it made about
 * eleven PostgREST calls per visit: the featured rail, the whole first page
 * of the catalogue (for the per-kind tally), each fanning out to its joins.
 * What it prints is the same for every signed-out visitor, so it is read
 * through a cookie-free anonymous client (exactly what a stranger may see,
 * whoever triggered the refresh) and held in this instance for five minutes.
 * A publish shows on the landing within five minutes; the search page and
 * the listing itself are unaffected and always live.
 */
export const LANDING_CATALOGUE_TTL_MS = 300_000;

export type LandingCatalogue = { featured: Listing[]; catalogue: Listing[] };

function anonymousRepository(): SupabaseListingRepository {
  return new SupabaseListingRepository(async () =>
    createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  );
}

const held = memo<LandingCatalogue>({
  ttlMs: LANDING_CATALOGUE_TTL_MS,
  empty: { featured: [], catalogue: [] },
  /* An empty read is an outage or an empty platform; neither is held for
     five minutes. */
  isFailure: (value) => value.catalogue.length === 0,
  load: async () => {
    const repo = anonymousRepository();
    const [featured, catalogue] = await Promise.all([repo.recommended(5), repo.search()]);
    return { featured, catalogue };
  },
});

/** The landing's shared read, or null when this deployment has no database. */
export async function landingCatalogue(): Promise<LandingCatalogue | null> {
  if (!isSupabaseConfigured() || process.env.NF_DATA_SOURCE === "api") return null;
  return held.get();
}

/** For tests. */
export function clearLandingCatalogue(): void {
  held.clear();
}
