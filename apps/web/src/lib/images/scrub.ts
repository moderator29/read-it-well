import "server-only";

import sharp, { type Metadata } from "sharp";

/**
 * SEC-04 / OPS-13: strip a photograph's metadata ON THE SERVER before it is
 * recorded against a public page.
 *
 * A phone photograph carries EXIF, and EXIF on a photograph of somebody's
 * home carries its GPS position. The listing wizard and the social paths
 * re-encode in the browser, which strips it, but a client step can be skipped:
 * the storage policies let a signed-in person upload straight into their own
 * folder of a public bucket, and `PhotoManager` (host and stay photographs)
 * uploaded the original bytes. So the action that attaches a photograph now
 * reads the object back, and when it carries EXIF, XMP or IPTC it is decoded,
 * turned upright by its orientation tag, re-encoded with NO metadata (sharp
 * drops all of it unless told otherwise) and written back over itself before
 * any row points at it. The colour profile is kept, because dropping it
 * shifts colours on wide-gamut phone photographs.
 *
 * The format is read from the bytes, not from the declared content type, and
 * anything that is not a JPEG, PNG or WebP is refused.
 */

export const SCRUBBABLE_FORMATS = ["jpeg", "png", "webp"] as const;
type Format = (typeof SCRUBBABLE_FORMATS)[number];

const CONTENT_TYPE: Record<Format, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export type ScrubResult =
  | { ok: true; changed: false; format: Format }
  | { ok: true; changed: true; format: Format; bytes: Buffer; contentType: string }
  | { ok: false; reason: "not-an-image" | "unsupported-format" };

/** True when the image carries metadata that can identify a place, a device or a person. */
export async function carriesPrivateMetadata(bytes: Buffer): Promise<boolean> {
  const meta = await sharp(bytes).metadata();
  return Boolean(meta.exif || meta.xmp || meta.iptc);
}

export async function scrubImage(bytes: Buffer): Promise<ScrubResult> {
  let meta: Metadata;
  try {
    meta = await sharp(bytes).metadata();
  } catch {
    return { ok: false, reason: "not-an-image" };
  }
  const format = meta.format as string | undefined;
  if (!format || !(SCRUBBABLE_FORMATS as readonly string[]).includes(format)) {
    return { ok: false, reason: "unsupported-format" };
  }
  const typed = format as Format;
  if (!meta.exif && !meta.xmp && !meta.iptc) return { ok: true, changed: false, format: typed };

  const pipeline = sharp(bytes).rotate().keepIccProfile();
  const out =
    typed === "jpeg"
      ? pipeline.jpeg({ quality: 88, mozjpeg: true })
      : typed === "png"
        ? pipeline.png()
        : pipeline.webp({ quality: 88 });
  return { ok: true, changed: true, format: typed, bytes: await out.toBuffer(), contentType: CONTENT_TYPE[typed] };
}

type StorageBucket = {
  download: (path: string) => Promise<{ data: Blob | null; error: unknown }>;
  upload: (
    path: string,
    body: Buffer,
    options: { contentType: string; upsert: boolean },
  ) => Promise<{ error: unknown }>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
};

export type StoredScrub = { ok: true; changed: boolean } | { ok: false; reason: string };

/**
 * Read an object back, scrub it, and overwrite it in place when it carried
 * metadata. On a file that is not a usable image the object is REMOVED and the
 * caller refuses to attach it: failing closed, because a public URL to an
 * unscrubbed original is the thing this exists to prevent.
 *
 * `bucket` is a service-role storage handle (`admin.storage.from(name)`): the
 * overwrite must succeed whatever the uploader's own policies allow.
 */
export async function scrubStoredPhoto(bucket: StorageBucket, path: string): Promise<StoredScrub> {
  const { data, error } = await bucket.download(path);
  if (error || !data) return { ok: false, reason: "missing" };
  const result = await scrubImage(Buffer.from(await data.arrayBuffer()));
  if (!result.ok) {
    await bucket.remove([path]);
    return { ok: false, reason: result.reason };
  }
  if (!result.changed) return { ok: true, changed: false };
  const { error: writeError } = await bucket.upload(path, result.bytes, {
    contentType: result.contentType,
    upsert: true,
  });
  if (writeError) {
    await bucket.remove([path]);
    return { ok: false, reason: "rewrite-failed" };
  }
  return { ok: true, changed: true };
}

/** The refusal an action shows when a photograph could not be made safe to publish. */
export const SCRUB_REFUSED_MESSAGE =
  "We could not prepare that photograph for your page, so it was not added. Use a JPEG, PNG or WebP photo and try again.";

/**
 * `scrubStoredPhoto` against a named bucket through the service role. Any
 * failure to reach storage is a refusal, never a silent pass.
 */
export async function scrubPublicPhoto(bucketName: string, path: string): Promise<StoredScrub> {
  try {
    const { createAdminClient } = await import("../supabase/admin");
    const bucket = createAdminClient().storage.from(bucketName) as unknown as StorageBucket;
    return await scrubStoredPhoto(bucket, path);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
