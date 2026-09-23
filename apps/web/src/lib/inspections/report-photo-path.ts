/**
 * The inspection photo path, and the two questions asked of it.
 *
 * THIS IS A SEPARATE MODULE FOR A HARD REASON, not for tidiness. Its callers
 * live in `actions.ts`, which carries `"use server"`, and a `"use server"`
 * module may export NOTHING that is not an async function. A synchronous
 * helper exported from there compiles, typechecks and passes every unit test,
 * and fails at `next build`. So the pure half lives here, where it can also be
 * tested without a session, a database or a bucket.
 */

/**
 * The extensions this product will issue an upload URL for, and the only ones
 * it will accept a row about afterwards.
 *
 * Taken from a closed list rather than from a file name, because a name arrives
 * from a browser and a bucket's mime rules are not a substitute for not
 * trusting it. `jpeg` maps onto `jpg` so one image does not arrive under two
 * spellings.
 */
export const PHOTO_EXTENSIONS = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  heic: "heic",
  pdf: "pdf",
} as const;

export type PhotoExtension = (typeof PHOTO_EXTENSIONS)[keyof typeof PHOTO_EXTENSIONS];

/**
 * Is this storage path one we minted for THIS inspection.
 *
 * The shape is `<inspection_id>/<uuid>.<ext>`, which is exactly what
 * `private.inspection_photo_path_access` reads in the bucket: the first segment
 * decides. **A signed upload proves where the bytes went. It does not prove
 * what the caller then says about them**, and the row that attaches a photo to
 * a report is a different object in a different schema from the object in the
 * bucket. Without this check a caller could post their own inspection id
 * alongside somebody else's path and hang that photo off their own report.
 *
 * Nothing is repaired into shape. A path we did not mint is a path we cannot
 * reason about, so it is refused.
 */
export function photoPathBelongsTo(inspectionId: string, storagePath: string): boolean {
  const segments = storagePath.split("/");
  if (segments.length !== 2) return false;
  if (segments[0] !== inspectionId) return false;
  const name = segments[1] ?? "";
  /* A leaf that is only an extension (".jpg") or has none is not a file we
     issued, and `name.split(".").pop()` alone would accept the first of those. */
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return false;
  return (Object.values(PHOTO_EXTENSIONS) as string[]).includes(name.slice(dot + 1));
}
