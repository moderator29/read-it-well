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
 * NOTE FOR WHOEVER MAINTAINS THE ONBOARDING SCRIPT, AND IT IS CLOSED.
 * `docs/ONBOARDING_A_RESTAURANT.md` item 21 told the founder to collect
 * photographs "under 50MB each" - 50MB is the social and walkthrough ceiling,
 * not a photograph's - and the bucket refuses anything over 10MB, so a
 * photograph collected on that promise could not be uploaded at all. The
 * document says 10MB now and it says it in the same words as the constant
 * below, which is the number the storage layer will actually honour. If that
 * ceiling ever moves, both move.
 */

/** The column's own ceiling: `position >= 0 and position < 10`. */
export const MAX_BUSINESS_PHOTOS = 10;

/**
 * What the picker offers. Narrower than the bucket's `allowed_mime_types`
 * (which still lists HEIC and HEIF) on purpose: the server step that strips a
 * photograph's metadata before it is published (`lib/images/scrub.ts`) cannot
 * decode HEIC, and HEIC does not render in Chrome or on Android anyway. With
 * HEIC left out of `accept`, iOS converts the photo to JPEG as it is picked.
 */
export const PHOTO_ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

/** The bucket's `file_size_limit`, exactly. */
export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_MAX_LABEL = "10MB";

/**
 * The words `rejectPhoto` says, in the owner's language: the PhotoManager's
 * `experienceHost.photoManager.controls`, which also names the accepted
 * formats as a list a person reads ("JPG, PNG or WEBP").
 */
export type RejectPhotoWords = { acceptedFormats: string; notAccepted: string; tooLarge: string };

/** Why a chosen file cannot be used, in words, before anything is uploaded. */
export function rejectPhoto(file: { type: string; size: number }, words: RejectPhotoWords): string | null {
  if (!(PHOTO_ACCEPTED_MIME as readonly string[]).includes(file.type)) {
    return words.notAccepted.replace("{formats}", words.acceptedFormats);
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return words.tooLarge.replace("{size}", PHOTO_MAX_LABEL);
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

/** The public bucket host, venue and stay photographs are uploaded to. */
export const HOST_PHOTO_BUCKET = "accommodation-photos";
