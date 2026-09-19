"use server";

/**
 * The feed's paging, bound to a timeline.
 *
 * BB's `loadMoreFeed(cursor, mode)` in `lib/social/posts-actions.ts` is the
 * one read behind every next page: the flag, the cursor and mode validation,
 * the session and the RLS-bound client all live there. `Feed` only ever sees
 * a function of a cursor, so this is the seam that binds the mode first: a
 * server action can carry a bound leading argument across to the client and
 * nothing else, and the mode is the argument the page knows and the client
 * must not choose.
 *
 * The mode travels with the cursor because the page's three timelines are
 * three different reads, and a cursor from one is meaningless against another.
 */

import { loadMoreFeed, type FeedMode } from "@/lib/social/posts-actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { FeedPage } from "@/lib/social/posts-queries";

export type { FeedMode };

/**
 * `page.tsx` binds `mode` and `Feed` supplies each cursor, so the component
 * only ever sees `(cursor) => Promise<ActionResult<FeedPage>>`.
 */
export async function loadMoreAround(
  mode: FeedMode,
  cursor: string,
): Promise<ActionResult<FeedPage>> {
  return loadMoreFeed(cursor, mode);
}
