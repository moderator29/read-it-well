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
 * Signed-in members keep the exact point.
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
 * The select to use for this client: exact when signed in, the public point
 * otherwise. Typed as the literal it was given, because the aliased form
 * returns the same keys (`latitude:latitude_public` arrives as `latitude`).
 */
export async function pointSelect<S extends string>(supabase: HasAuth, select: S): Promise<S> {
  return ((await readsSignedIn(supabase)) ? select : withPublicPoint(select)) as S;
}
