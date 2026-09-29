/**
 * THE WIZARD'S PHOTO GATE, AS PURE FUNCTIONS.
 *
 * Three decisions the listing wizard makes about a photo before it spends
 * anybody's data uploading it, kept out of the component so each is tested.
 *
 * 1. SIZE IS JUDGED ON THE LONG EDGE. The rule is "sharp on every screen",
 *    and a portrait photo is shown as a portrait: a 1200 x 1600 shot has the
 *    same pixels as a 1600 x 1200 one. Gating on `width` refused every
 *    portrait photo under 1600 wide, and every photo forwarded through
 *    WhatsApp, which caps the long edge at about 1600, so a portrait forward
 *    arrives 1200 wide. `MIN_PHOTO_WIDTH` is the long-edge minimum.
 *
 * 2. A PHOTO THE BROWSER CANNOT DECODE IS NOT "TOO NARROW". Chrome, Android
 *    and desktop browsers other than Safari cannot decode HEIC, so the
 *    measurement came back as 0 and the lister was told their 4000px iPhone
 *    photo was too narrow. HEIC gets a sentence that says what to do about
 *    it, and any other undecodable file says it could not be read. Android's
 *    picker often reports HEIC with an empty mime type, so the file name
 *    counts as evidence too.
 *
 * 3. A STORAGE REFUSAL SAYS WHICH ONE IT WAS. Size, type, permission and a
 *    dropped connection are four different next steps.
 *
 * The sentences themselves live in the dictionary (`agentListings.photos`);
 * this file only decides which one applies.
 */

import { MIN_PHOTO_WIDTH } from "@/lib/agent/listings-schema";

/** The long-edge minimum, in pixels. */
export const MIN_PHOTO_LONG_EDGE = MIN_PHOTO_WIDTH;

export type PhotoVerdict = "ok" | "not-image" | "heic-undecodable" | "undecodable" | "too-small";

const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp)$/i;

/** Whether a file is HEIC or HEIF, by its declared type or its name. */
export function isHeic(file: { type: string; name: string }): boolean {
  if (HEIC_TYPES.has(file.type.toLowerCase())) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

/**
 * Whether a file could be a photo at all. An empty type is not a refusal on
 * its own: Android reports HEIC (and some gallery apps report everything)
 * with no type, and the decode that follows is the real test.
 */
export function looksLikeImage(file: { type: string; name: string }): boolean {
  if (file.type.startsWith("image/")) return true;
  return file.type === "" && IMAGE_EXTENSION.test(file.name);
}

/**
 * The verdict on one photo, given its measured size. `size` is null when the
 * browser could not decode the file.
 */
export function judgePhoto(
  file: { type: string; name: string },
  size: { width: number; height: number } | null,
): PhotoVerdict {
  if (!looksLikeImage(file)) return "not-image";
  if (!size || size.width <= 0 || size.height <= 0) {
    return isHeic(file) ? "heic-undecodable" : "undecodable";
  }
  return Math.max(size.width, size.height) < MIN_PHOTO_LONG_EDGE ? "too-small" : "ok";
}

/** The sentences a storage refusal can become, from `agentListings.photos`. */
export type UploadWords = { tooBig: string; wrongType: string; signedOut: string; failed: string };

/**
 * A storage upload refusal as the sentence the lister can act on. The client
 * surfaces `statusCode` as a string or a number depending on its version, and
 * a dropped connection often has no status at all.
 */
export function uploadErrorText(
  error: { message?: string; statusCode?: string | number; status?: string | number } | null | undefined,
  words: UploadWords,
): string {
  if (!error) return words.failed;
  const status = Number(error.statusCode ?? error.status ?? NaN);
  const message = (error.message ?? "").toLowerCase();
  if (status === 413 || message.includes("maximum allowed size") || message.includes("too large")) {
    return words.tooBig;
  }
  if (status === 415 || message.includes("mime type") || message.includes("not supported")) {
    return words.wrongType;
  }
  if (status === 401 || status === 403 || message.includes("row-level security") || message.includes("unauthorized")) {
    return words.signedOut;
  }
  return words.failed;
}

/** "name: reason" for the per-file list, with long names shortened. */
export function fileLine(name: string, reason: string): string {
  const shown = name.length > 40 ? `${name.slice(0, 18)}...${name.slice(-18)}` : name;
  return shown ? `${shown}: ${reason}` : reason;
}
