import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "../admin/guard";
import { hashListingPhotos } from "./hash-server";
import { coverageFrom, photoMatchesFrom, type PhotoMatch } from "./dhash";

/**
 * WHAT THE REVIEW DESK SEES ABOUT A LISTING'S PHOTOGRAPHS (V-45).
 *
 * First any photograph not yet hashed is hashed (bounded, as the service
 * role), so a listing whose upload-time hash failed is still compared before
 * a person decides. Then `public.listing_photo_matches`, which answers staff
 * only, under the reviewer's own session.
 *
 *   not-compared  no service role here, so nothing could be hashed: the desk
 *                 says so, and never "no matches".
 *   failed        the read failed: the desk says so.
 *   ok            the matches, possibly none, and how much was compared:
 *                 this listing's photographs hashed out of how many, against
 *                 how many hashed photographs elsewhere, and how many across
 *                 Vallo still wait for the backfill.
 */
export type HashCoverage = { photos: number; hashed: number; pool: number; poolWaiting: number };

export type PhotoProvenance =
  | { state: "not-compared" }
  | { state: "failed" }
  | { state: "ok"; matches: PhotoMatch[]; coverage: HashCoverage };

export async function readPhotoProvenance(listingId: string): Promise<PhotoProvenance> {
  /* The listing desk's scope. The two functions decide on auth.uid() with
     `private.staff_can(..., 'listing_approval')`, so they are called with the
     caller's OWN client, never the service client a staff member is handed. */
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin") return { state: "failed" };
  const hashed = await hashListingPhotos(listingId);
  if (hashed === null) return { state: "not-compared" };
  try {
    const supabase = access.userClient as unknown as SupabaseClient;
    const [matches, coverage] = await Promise.all([
      supabase.rpc("listing_photo_matches", { p_listing: listingId }),
      supabase.rpc("listing_photo_hash_coverage", { p_listing: listingId }),
    ]);
    const cov = coverageFrom(coverage.data);
    if (matches.error || coverage.error || !cov) return { state: "failed" };
    return { state: "ok", matches: photoMatchesFrom(matches.data), coverage: cov };
  } catch {
    return { state: "failed" };
  }
}

/**
 * C8: how many photographs of each listing were seen on ANOTHER listing, for
 * the queue's "Photo seen elsewhere (n)" mark. Reads only: it hashes nothing
 * (the nightly backfill and the upload do that), so the queue stays fast.
 * A listing whose read failed is absent from the map, and draws no mark.
 */
export async function readPhotoMatchCounts(listingIds: readonly string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const access = await requireAdmin("listing_approval");
  if (access.state !== "admin" || listingIds.length === 0) return out;
  const supabase = access.userClient as unknown as SupabaseClient;
  await Promise.all(
    listingIds.slice(0, 60).map(async (id) => {
      try {
        const { data, error } = await supabase.rpc("listing_photo_matches", { p_listing: id });
        if (error) return;
        const photos = new Set(photoMatchesFrom(data).map((m) => m.photoId));
        out.set(id, photos.size);
      } catch {
        /* No mark rather than a wrong one. */
      }
    }),
  );
  return out;
}
