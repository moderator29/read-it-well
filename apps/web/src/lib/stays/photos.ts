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
 * Two shapes pass through untouched: an absolute URL (an import, a partner
 * row) and an absolute PUBLIC PATH starting with a slash, which the app serves
 * itself from `apps/web/public`. The example stays seed carries the second
 * shape (`/brand/photos/bedroom-01.jpg`), so the photograph a demo hotel shows
 * is one compressed and filed in the repository, not a bucket object that does not
 * exist. A bucket path never starts with a slash, so the two cannot collide.
 */
const BUCKET = "accommodation-photos";

export function accommodationPhotoUrl(storagePath: string): string {
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  if (storagePath.startsWith("/")) return storagePath;
  const path = storagePath.replace(new RegExp(`^${BUCKET}/`), "");
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
