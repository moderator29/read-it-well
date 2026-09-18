import { SUPABASE_URL } from "../supabase/env";

/**
 * The public object URL for an accommodation photo.
 *
 * `accommodation_photos` stores a storage path, never a URL, exactly as
 * `listing_photos` does, and the bucket M3 creates is public with the same
 * owner-folder write policies. This is the stays twin of the listing
 * repository's own `photoUrl`, kept as ONE exported definition because two
 * surfaces already need it (the stay detail route and, next, the shelf card)
 * and a second copy is how one of them ends up pointing at the wrong bucket.
 *
 * A value that is already an absolute URL is returned untouched, so a row
 * carrying a full address (an import, a seeded example) still renders.
 */
const BUCKET = "accommodation-photos";

export function accommodationPhotoUrl(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  const path = storagePath.replace(/^\/+/, "").replace(new RegExp(`^${BUCKET}/`), "");
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
