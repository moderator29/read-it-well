import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostView } from "@/components/social/feed/PostCard";
import { readPersonBadges } from "../trust/badge-tier";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * THE VERIFIED MARK ON A FEED CARD, READ AND NEVER DERIVED.
 *
 * The founder's feed image draws a tick beside every name. On Vallo that tick
 * is Session A's `TierBadge`, and its only source is `public.person_badge`
 * (`readPersonBadges`, one read for the whole page). This stamps each post's
 * author with the tier that view published and nothing else; a person with no
 * row, and every failed read, comes back with no tier, which draws no mark.
 *
 * It lives beside the reads rather than inside `posts-queries.ts` because
 * Session B's claim on that file is the deleted-post filter only. The feed
 * route calls it on page one and on every next page,
 * so a card never gains or loses its mark by scrolling (`app/(app)/around/feed-actions.ts`).
 */
export function withAuthorTiers(
  posts: PostView[],
  tiers: ReadonlyMap<string, string>,
): PostView[] {
  return posts.map((post) => {
    if (!post.author) return post;
    const tier = tiers.get(post.author.id);
    return tier === "gold" || tier === "platinum"
      ? { ...post, author: { ...post.author, tier } }
      : { ...post, author: { ...post.author, tier: "none" } };
  });
}

export async function stampAuthorTiers(
  posts: PostView[],
  client?: Pick<SupabaseClient, "from">,
): Promise<PostView[]> {
  const ids = posts.flatMap((post) => (post.author?.id ? [post.author.id] : []));
  if (ids.length === 0 || !isSupabaseConfigured()) return posts;
  try {
    const db = client ?? (await createClient());
    return withAuthorTiers(posts, await readPersonBadges(db, ids));
  } catch {
    /* No read, no mark. A missing tick costs a second look; a wrong one lies. */
    return posts;
  }
}
