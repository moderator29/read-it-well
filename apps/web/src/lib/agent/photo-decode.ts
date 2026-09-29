/**
 * WHY A PHOTO COULD NOT BE READ, SAID AS WHAT IT IS.
 *
 * The listing wizard measures a photo's width by decoding it in the browser
 * (`createImageBitmap`, then an `<img>`), and re-encodes it to strip location
 * metadata the same way. Chrome, Firefox and every Android browser cannot
 * decode HEIC or HEIF, the format an iPhone shoots by default. The measure
 * came back as zero, zero is under the 1600px floor, and the person was told
 * their photo was "too narrow": a sentence about the wrong problem, with no
 * way to act on it, about a 4032px photograph.
 *
 * So a decode failure is now its own outcome, and for HEIC it names the fix:
 * choose a JPEG or PNG, or set the camera to "Most compatible". Recognised by
 * type or by extension, because Chrome on a desktop often reports a `.heic`
 * file with an empty type. Safari decodes HEIC natively, so it never reaches
 * this message there.
 *
 * Client-safe and pure, so the choice is tested without a browser.
 */

export const HEIC_NOT_SUPPORTED =
  "This photo is in HEIC format, which this browser cannot open. Choose a JPEG or PNG instead, or on your iPhone go to Settings, Camera, Formats and choose Most Compatible, then take the photo again.";

const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

export function isHeicLike(file: { type?: string | null; name?: string | null }): boolean {
  const type = (file.type ?? "").trim().toLowerCase();
  if (HEIC_TYPES.has(type)) return true;
  return /\.(heic|heif)$/i.test((file.name ?? "").trim());
}

/**
 * The notice for a photo the browser could not decode. `fallback` is the
 * wizard's own "could not prepare this photo" sentence, for every format that
 * is not HEIC.
 */
export function undecodablePhotoNotice(
  file: { type?: string | null; name?: string | null },
  fallback: string,
): string {
  return isHeicLike(file) ? HEIC_NOT_SUPPORTED : fallback;
}
