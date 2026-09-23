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
import { stampAuthorTiers } from "@/lib/social/author-badges";

/*
 * A "use server" MODULE MAY EXPORT ASYNC FUNCTIONS AND NOTHING ELSE, and a
 * type RE-EXPORT counts as something else.
 *
 * `export type { FeedMode };` stood here so `page.tsx` could take the type
 * from the same file as the action. TypeScript erases it, so `tsc --noEmit`
 * is silent, and it is not a runtime value, so the unit tests never see it.
 * The production compiler is the only gate that catches it: Turbopack builds
 * one actions manifest per server module and puts every named export in it,
 * so this line asked for an action id for a type, and the build failed with
 * "Export FeedMode doesn't exist in target module". It took production down.
 *
 * The type belongs to `lib/social/posts-actions`, which declares it, and a
 * consumer imports it from there. A type alias DECLARED inside a "use server"
 * module is erased whole and is fine; a re-export statement is not.
 */

/**
 * `page.tsx` binds `mode` and `Feed` supplies each cursor, so the component
 * only ever sees `(cursor) => Promise<ActionResult<FeedPage>>`.
 */
export async function loadMoreAround(
  mode: FeedMode,
  cursor: string,
): Promise<ActionResult<FeedPage>> {
  const page = await loadMoreFeed(cursor, mode);
  /* Page two carries the same marks as page one: the published badge of
     each author, read once for the page. */
  if (!page.ok) return page;
  return { ...page, data: { ...page.data, posts: await stampAuthorTiers(page.data.posts) } };
}
