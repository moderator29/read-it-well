"use server";

/**
 * THE FEED PAGING SEAM. READ THIS BEFORE TOUCHING IT.
 *
 * Ledger section 2.1 has BB exposing `loadMoreFeed(cursor)` as a server action
 * in `lib/social/posts-actions.ts`. It had not landed when the feed's load-more
 * control was built, so this file is the seam: the same name, the same
 * envelope, wired to the three existing cursor reads the page itself makes.
 * When BB's action lands, `page.tsx` swaps this import for that one and this
 * file goes. Nothing about the `Feed` component changes either way, because it
 * only ever sees a function of a cursor.
 *
 * The mode travels with the cursor because the page's three timelines are three
 * different reads, and a cursor from one is meaningless against another.
 * `resolveSession` decides the viewer here exactly as the page did, so the
 * second page is read under the same RLS as the first.
 */

import { fail, ok, type ActionResult } from "@/lib/actions/envelope";
import { resolveSession } from "@/lib/actions/session";
import { listMyAreas } from "@/lib/social/areas-queries";
import {
  getAreaFeed,
  getEverywhereFeed,
  getJoinedFeed,
  type FeedPage,
} from "@/lib/social/posts-queries";
import type { FeedTab } from "@/components/social/feed/FeedMasthead";

export type FeedContext = {
  mode: FeedTab;
  /** Set when one place is chosen in the location chip. */
  areaId?: string;
};

/**
 * The page binds `context` and `Feed` supplies each cursor, so the component
 * only ever sees `(cursor) => Promise<ActionResult<FeedPage>>`, which is the
 * exact shape BB's `loadMoreFeed(cursor)` will have.
 */
export async function loadMoreFeed(
  context: FeedContext,
  cursor: string,
): Promise<ActionResult<FeedPage>> {
  const input = { ...context, cursor };
  if (typeof input.cursor !== "string" || input.cursor.length === 0 || input.cursor.length > 64) {
    return fail("That page could not be read. Reload the feed and try again.");
  }
  /* A cursor is a `created_at` from the previous page. Anything that does not
     parse as a date is not one of ours. */
  if (Number.isNaN(Date.parse(input.cursor))) {
    return fail("That page could not be read. Reload the feed and try again.");
  }

  const session = await resolveSession();
  if (session.state === "unconfigured") {
    return fail("We cannot reach the feed right now. This is on our side, not yours.");
  }
  const viewerId = session.state === "signed-in" ? session.user.id : null;

  try {
    if (input.areaId) return ok(await getAreaFeed(input.areaId, input.cursor));

    const mine = viewerId ? await listMyAreas() : [];
    const joined = viewerId !== null && mine.length > 0;

    if (input.mode === "following") {
      return ok(
        joined ? await getJoinedFeed(viewerId, input.cursor) : { posts: [], cursor: null, ended: true },
      );
    }
    if (input.mode === "new") return ok(await getEverywhereFeed(input.cursor));
    return ok(
      joined ? await getJoinedFeed(viewerId, input.cursor) : await getEverywhereFeed(input.cursor),
    );
  } catch {
    return fail("More posts did not load. Check your connection and try again.");
  }
}
