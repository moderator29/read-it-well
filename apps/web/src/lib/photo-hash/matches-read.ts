import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { hashListingPhotos } from "./hash-server";
import { photoMatchesFrom, type PhotoMatch } from "./dhash";

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
 *   ok            the matches, possibly none.
 */
export type PhotoProvenance =
  | { state: "not-compared" }
  | { state: "failed" }
  | { state: "ok"; matches: PhotoMatch[] };

export async function readPhotoProvenance(listingId: string): Promise<PhotoProvenance> {
  const hashed = await hashListingPhotos(listingId);
  if (hashed === null) return { state: "not-compared" };
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase.rpc("listing_photo_matches", { p_listing: listingId });
    if (error) return { state: "failed" };
    return { state: "ok", matches: photoMatchesFrom(data) };
  } catch {
    return { state: "failed" };
  }
}
