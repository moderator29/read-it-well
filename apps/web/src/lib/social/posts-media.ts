import "server-only";

/**
 * Reading the pictures attached to posts.
 *
 * `social-media` is a PRIVATE bucket, deliberately: a photo in a post is far
 * more likely to be a picture of a street, a gate or a generator outside where
 * somebody actually lives than a cover photo is, and a private bucket keeps the
 * object unreachable after the post carrying it is removed, which a public
 * bucket cannot do because the URL outlives the row.
 *
 * That decision has one consequence and this module is it: every picture needs
 * a signed URL. Signing is done for a whole page at once rather than per card,
 * because sixty tiles in a media grid would otherwise be sixty round trips.
 *
 * Read access is not ownership. `private.social_media_access` resolves the post
 * id out of the object path and defers to `private.can_see_post`, so a picture
 * is exactly as visible as the post carrying it: live and unblocked means
 * readable, held or removed or blocked means not.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

export const MEDIA_BUCKET = "social-media";

/** Long enough to read a page, short enough that a copied URL is not a leak. */
const SIGNED_SECONDS = 60 * 60;

export type PostMediaItem = {
  postId: string;
  storagePath: string;
  width: number | null;
  height: number | null;
};

export type SignedMedia = PostMediaItem & { url: string };

/**
 * Sign a page of pictures in one call.
 *
 * An item whose URL could not be signed is dropped rather than returned with an
 * empty `src`, because a broken image tile reads as a bug in the product where
 * an absent one reads as a post with fewer pictures.
 */
export async function signMedia(
  supabase: SupabaseClient<Database>,
  items: PostMediaItem[],
): Promise<SignedMedia[]> {
  if (items.length === 0) return [];
  try {
    const paths = items.map((item) => item.storagePath);
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(paths, SIGNED_SECONDS);
    if (error || !data) return [];

    const urlByPath = new Map<string, string>();
    for (const entry of data) {
      if (entry.signedUrl && entry.path) urlByPath.set(entry.path, entry.signedUrl);
    }

    return items
      .map((item) => {
        const url = urlByPath.get(item.storagePath);
        return url ? { ...item, url } : null;
      })
      .filter((item): item is SignedMedia => item !== null);
  } catch {
    return [];
  }
}

/** The columns every post read in this layer asks for. One list, one shape. */
export const POST_COLUMNS = `
  id, area_id, root_id, parent_id, depth, author_id, author_kind, kind, body,
  listing_id, payload, reply_count, like_count, repost_count, view_count,
  status, hold_reason, created_at, edited_at
`;

/**
 * Read a specific set of posts by id.
 *
 * Used by Activity, which knows which posts it wants from the reaction rows
 * before it knows anything about them. Returns raw rows for the caller's own
 * mapper, so there is exactly one place that turns a row into a card.
 */
export async function readPostViews(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<unknown[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await supabase.from("posts").select(POST_COLUMNS).in("id", ids);
    if (error || !data) return [];
    return data as unknown[];
  } catch {
    return [];
  }
}

/**
 * The pictures on a set of posts, signed, grouped by post.
 *
 * One read and one signing call for a whole feed. A post with no pictures is
 * simply absent from the map, which is what lets a card render `media ?? []`
 * without a second question.
 */
export async function readMediaFor(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, SignedMedia[]>> {
  const grouped = new Map<string, SignedMedia[]>();
  if (postIds.length === 0) return grouped;

  try {
    const { data, error } = await supabase
      .from("post_media")
      .select("post_id, storage_path, position, width, height")
      .in("post_id", postIds)
      .order("position", { ascending: true });
    if (error || !data) return grouped;

    const items: PostMediaItem[] = (
      data as { post_id: string; storage_path: string; width: number | null; height: number | null }[]
    ).map((row) => ({
      postId: row.post_id,
      storagePath: row.storage_path,
      width: row.width,
      height: row.height,
    }));

    for (const signed of await signMedia(supabase, items)) {
      const list = grouped.get(signed.postId);
      if (list) list.push(signed);
      else grouped.set(signed.postId, [signed]);
    }
    return grouped;
  } catch {
    return grouped;
  }
}
