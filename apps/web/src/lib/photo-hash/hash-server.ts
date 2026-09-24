import "server-only";

import { hasServiceRole } from "../security/service-rpc";
import { createAdminClient } from "../supabase/admin";
import { HASH_HEIGHT, HASH_WIDTH, dHash, toSigned64 } from "./dhash";

/**
 * HASHING A LISTING'S PHOTOGRAPHS (V-45), ON THE SERVER, AS THE SERVICE ROLE.
 *
 * The hash is computed from the object Vallo stored, never from anything the
 * browser sends, and written through `public.set_listing_photo_phash`, which
 * only the service role can call: a lister who could write their own hash
 * would write one that matches nothing.
 *
 * Called twice, both bounded and both silent on failure:
 *   after a photo is attached (`addPhoto`, through `after()`), and
 *   when the review desk opens a listing, for any photo not yet hashed, so a
 *   listing whose upload-time hash failed is still compared before a person
 *   decides.
 *
 * With no service role configured (a developer's machine) it does nothing,
 * and the desk says the photographs have not been compared rather than that
 * they matched nothing.
 */

const PHOTO_BUCKET = "listing-photos";
/** A listing holds ten photographs; this is a ceiling, not a target. */
const MAX_PER_CALL = 12;

type Loose = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): { limit(n: number): Promise<{ data: unknown; error: unknown }> };
      in(column: string, values: string[]): Promise<{ data: unknown; error: unknown }>;
    };
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
  storage: { from(bucket: string): { download(path: string): Promise<{ data: Blob | null; error: unknown }> } };
};

/**
 * The 9 by 8 grey pixels of an image, the only thing the hash reads.
 *
 * `sharp` is imported when it is needed, not at the top: it is a native
 * module the root workspace installs (declared in the root package.json, not
 * apps/web's), and a machine without it must still be able to attach a photo.
 * Every caller sits inside a try, so a missing sharp costs a hash, never an
 * upload.
 */
export async function greyPixels(bytes: Buffer): Promise<Uint8Array> {
  const { default: sharp } = await import("sharp");
  const { data } = await sharp(bytes)
    .rotate()
    .resize(HASH_WIDTH, HASH_HEIGHT, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}

type PhotoRow = { id: string; storage_path: string };

async function hashRows(admin: Loose, rows: PhotoRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data: done } = await admin.from("listing_photo_hashes").select("photo_id").in(
    "photo_id",
    rows.map((row) => row.id),
  );
  const already = new Set(Array.isArray(done) ? (done as { photo_id: string }[]).map((d) => d.photo_id) : []);
  let hashed = 0;
  for (const photo of rows) {
    if (already.has(photo.id)) continue;
    try {
      const { data: blob, error } = await admin.storage.from(PHOTO_BUCKET).download(photo.storage_path);
      if (error || !blob) continue;
      const grey = await greyPixels(Buffer.from(await blob.arrayBuffer()));
      const { error: writeError } = await admin.rpc("set_listing_photo_phash", {
        p_photo: photo.id,
        p_hash: toSigned64(dHash(grey)).toString(),
      });
      if (!writeError) hashed += 1;
    } catch {
      /* One unreadable photograph costs its own hash and nothing else. */
      continue;
    }
  }
  return hashed;
}

/**
 * Hash every not-yet-hashed photo of one listing. Returns how many were
 * hashed, or null when hashing is not possible here (no service role).
 */
export async function hashListingPhotos(listingId: string): Promise<number | null> {
  if (!hasServiceRole()) return null;
  try {
    const admin = createAdminClient() as unknown as Loose;
    const { data: photos } = await admin.from("listing_photos").select("id, storage_path").eq("listing_id", listingId).limit(MAX_PER_CALL);
    return await hashRows(admin, Array.isArray(photos) ? (photos as PhotoRow[]) : []);
  } catch {
    return null;
  }
}

/** How many photographs one backfill press hashes. Bounded, so it never runs away. */
export const BACKFILL_BATCH = 60;

/**
 * THE BACKFILL: hash the next photographs across Vallo that have none, the
 * ones uploaded before V-45. Staff press it from the review desk; it is
 * bounded to a batch so a press is a few seconds, not a migration.
 */
export async function backfillPhotoHashes(): Promise<number | null> {
  if (!hasServiceRole()) return null;
  try {
    const admin = createAdminClient() as unknown as Loose & {
      rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
    };
    const { data } = await admin.rpc("listing_photos_without_hash", { p_limit: BACKFILL_BATCH });
    return await hashRows(admin, Array.isArray(data) ? (data as PhotoRow[]) : []);
  } catch {
    return null;
  }
}
