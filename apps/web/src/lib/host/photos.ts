/**
 * What a venue's photograph has to be, stated once for both sides.
 *
 * Client-safe on purpose, exactly like `onboarding.ts` next door: the browser
 * refuses a file before a byte leaves the device, and the server action and
 * the reader use the same numbers. Two copies of a ceiling is how a form comes
 * to promise 50MB into a bucket that refuses anything over 10.
 *
 * THESE ARE THE BUCKET'S OWN LIMITS, read off the migration that created it
 * (`20260918081149_m03_accommodations_photos_amenities_bucket`) rather than
 * chosen here: `accommodation-photos` is public, capped at 10MB an object, and
 * accepts five image types. The business spine shares that bucket, for the
 * reasons the P3 migration sets out, so it shares its limits too.
 *
 * NOTE FOR WHOEVER MAINTAINS THE ONBOARDING SCRIPT.
 * `docs/ONBOARDING_A_RESTAURANT.md` item 21 tells the founder to collect
 * photographs "under 50MB each". The bucket refuses anything over 10MB, so a
 * 50MB photograph collected on that promise cannot be uploaded at all. The
 * number below is the one the storage layer will actually honour.
 */

/** The column's own ceiling: `position >= 0 and position < 10`. */
export const MAX_BUSINESS_PHOTOS = 10;

/** The bucket's `allowed_mime_types`, exactly. */
export const PHOTO_ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export const PHOTO_ACCEPTED_LABEL = "JPG, PNG, WEBP or HEIC";

/** The bucket's `file_size_limit`, exactly. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_LABEL = "10MB";

/** Why a chosen file cannot be used, in words, before anything is uploaded. */
export function rejectPhoto(file: { type: string; size: number }): string | null {
  if (!(PHOTO_ACCEPTED_MIME as readonly string[]).includes(file.type)) {
    return `That file is not ${PHOTO_ACCEPTED_LABEL}. A photograph straight from a phone is one of those.`;
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return `That photograph is over ${PHOTO_MAX_LABEL}. Send it at a smaller size and choose it again.`;
  }
  return null;
}

/**
 * The position a new photograph takes: the lowest one not already used.
 *
 * `position` is unique per venue and 0 is the cover everywhere these rows are
 * read, so the number is decided on the server rather than posted by a form.
 * Null when the venue is full, which the caller turns into a sentence rather
 * than a failed insert on the unique index.
 *
 * The lowest FREE slot rather than max + 1, because removing a photograph
 * leaves its number behind: after taking down the cover of three, the next
 * upload should fill the hole at 0 and become the cover, which is the only
 * reordering control this surface offers and the only one it needs.
 */
export function nextPhotoPosition(used: readonly number[]): number | null {
  const taken = new Set(used);
  for (let position = 0; position < MAX_BUSINESS_PHOTOS; position += 1) {
    if (!taken.has(position)) return position;
  }
  return null;
}
