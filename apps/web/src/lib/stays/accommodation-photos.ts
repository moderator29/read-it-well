import "server-only";

/**
 * Photographs on the accommodation spine, read.
 *
 * THE TWIN OF `business-photos.ts`, AND DELIBERATELY SO. `accommodation_photos`
 * came first (migration `20260918081149_m03_accommodations_photos_amenities_bucket`)
 * and `business_photos` was modelled on it for the restaurant spine: up to ten
 * rows, position 0 is the cover, and `storage_path` is a path inside the PUBLIC
 * `accommodation-photos` bucket rather than a URL. Both readers turn a path
 * into a URL through the single `accommodationPhotoUrl`, so neither can drift
 * onto the wrong bucket.
 *
 * WHY THIS FILE EXISTS AT ALL, WHICH IS THE POINT. The table, the bucket, its
 * four storage policies and the catalogue trigger were all built in M3 and no
 * application code ever wrote a row or read one. The submission gate in
 * `lib/host/onboarding.ts` blocks a hotel or shortlet with no photograph, so
 * every accommodation host could fill in nine steps and never press send. This
 * is the read half of closing that.
 *
 * Every read goes through the caller's own RLS-bound client and asks.
 * `accommodation_photos_select` answers: anybody may read the photographs of a
 * published accommodation on a published business, the owner may read their own
 * whatever its status, and an admin may read any. Nothing here re-states that
 * rule, and nothing here throws: a failed read is no photographs, which every
 * surface already draws honestly with a category plate.
 */

import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import { accommodationPhotoUrl } from "./photos";
import { MAX_BUSINESS_PHOTOS } from "../host/photos";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AccommodationPhoto = {
  id: string;
  /** The stored path, which is what a write and a delete work on. */
  storagePath: string;
  /** The public URL, which is what a surface renders. */
  url: string;
  /** 0 is the cover. */
  position: number;
};

/** One property's photographs, cover first. Empty when it has none. */
export async function listAccommodationPhotos(
  accommodationId: string,
): Promise<AccommodationPhoto[]> {
  if (!isSupabaseConfigured() || !UUID_RE.test(accommodationId)) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("accommodation_photos")
      .select("id, storage_path, position")
      .eq("accommodation_id", accommodationId)
      .order("position", { ascending: true })
      .limit(MAX_BUSINESS_PHOTOS);
    if (error || !data) return [];
    return data.map((row) => ({
      id: row.id,
      storagePath: row.storage_path,
      url: accommodationPhotoUrl(row.storage_path),
      position: row.position,
    }));
  } catch {
    return [];
  }
}
