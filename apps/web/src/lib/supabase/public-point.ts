import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * NEW-A4-01: what a signed-out reader may know about where a place is.
 *
 * `anon` cannot select `latitude`, `longitude` or `location` on listings,
 * accommodations, businesses or catalogue_entries. It reads the database's
 * own rounded twins, `latitude_public` and `longitude_public` (two decimals,
 * about 1.1 km). PostgREST refuses a whole read when one named column is
 * denied, so a signed-out select must name the twins, aliased back to the
 * usual keys so every mapper downstream reads the same shape.
 *
 * 29 September: signed-in members read the public point too. An account is
 * free, so "signed in" was never a reason to know where somebody lives;
 * `authenticated` no longer holds the exact columns either. The exact point
 * reaches only the lister, staff, and a party with a confirmed inspection or
 * a live agreement, through `public.listing_exact_location`.
 */
export const ANON_DENIED_POINT_COLUMNS = ["latitude", "longitude", "location"] as const;

/** Rewrite a PostgREST select so it names the public point instead of the exact one. */
export function withPublicPoint(select: string): string {
  return select
    .replace(/(^|[\s,(])latitude(?=\s*(,|\)|$))/gm, "$1latitude:latitude_public")
    .replace(/(^|[\s,(])longitude(?=\s*(,|\)|$))/gm, "$1longitude:longitude_public");
}

/**
 * Whether this client carries a session, so a read can choose its projection.
 *
 * This decides only WHICH columns are asked for, never whether a row is
 * shown: the database enforces the point either way, and a wrong answer here
 * costs a refused read or a coarse pin, not a leak.
 */
type HasAuth = { auth: Pick<SupabaseClient["auth"], "getSession"> };

export async function readsSignedIn(supabase: HasAuth): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  } catch {
    return false;
  }
}

/**
 * The select to use for a catalogue read: always the public point, whoever is
 * asking. Typed as the literal it was given, because the aliased form returns
 * the same keys (`latitude:latitude_public` arrives as `latitude`). The client
 * parameter is kept so callers need not change.
 */
export async function pointSelect<S extends string>(_supabase: HasAuth, select: S): Promise<S> {
  return withPublicPoint(select) as S;
}
