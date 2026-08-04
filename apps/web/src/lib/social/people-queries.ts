import "server-only";

/**
 * Finding a person.
 *
 * **`/u/[handle]` answered for every handle and nothing answered for none of
 * them.** A handle was reachable only if you already knew it, which made the
 * follow graph a feature you could only use on people you had already met, and
 * it is the same criticism `SOCIAL_DESIGN.md` levelled at the follow graph it
 * originally cut. This is the read behind the directory that fixes it.
 *
 * Two answers, and they are deliberately different questions.
 *
 * **A search** over handle and display label, because somebody looking for a
 * particular person types their name. `ilike` on two columns, escaped, capped,
 * and nothing clever: a name index and a ranking function for a product with
 * this many people would be engineering ahead of the problem.
 *
 * **A short list of people to start from**, because a directory that is empty
 * until you type is a directory nobody uses twice. Newest first rather than
 * most followed: a leaderboard of the best connected accounts is a thing that
 * entrenches itself, and the people worth meeting in a neighbourhood product are
 * the ones who just arrived in it.
 *
 * `social_profiles_select` carries `not private.blocked_with(user_id)`, so
 * somebody a block touches in either direction is simply not in any of these
 * answers, and this file does not restate that rule.
 */

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";

export type PersonRow = {
  userId: string;
  handle: string;
  displayLabel: string;
  avatarUrl: string;
  isAgent: boolean;
  bio: string;
  viewerFollows: boolean;
  isViewer: boolean;
};

export type PeopleDirectory =
  | { state: "unconfigured" }
  | {
      state: "ready";
      signedIn: boolean;
      /** What was searched for, echoed back so the page can say so. */
      query: string;
      people: PersonRow[];
    };

const LIMIT = 30;

/**
 * PostgREST's `or` filter is a comma separated expression, so a comma or a
 * bracket in the search text would change its meaning rather than be matched.
 * The `%` and `_` wildcards are the same problem one level down.
 */
function safePattern(raw: string): string {
  return raw.replace(/[%_,()\\]/g, " ").trim();
}

export async function findPeople(rawQuery: string): Promise<PeopleDirectory> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };

  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;
  const query = rawQuery.trim().slice(0, 40);

  try {
    let read = supabase
      .from("social_profiles")
      .select("user_id, handle, display_label, avatar_path, is_agent, bio, bio_status")
      .limit(LIMIT);

    const pattern = safePattern(query);
    read = pattern
      ? read.or(`handle.ilike.%${pattern}%,display_label.ilike.%${pattern}%`).order("handle")
      : read.order("handle_claimed_at", { ascending: false });

    const { data, error } = await read;
    if (error || !data) return { state: "ready", signedIn: Boolean(viewerId), query, people: [] };

    const rows = data as {
      user_id: string;
      handle: string;
      display_label: string | null;
      avatar_path: string | null;
      is_agent: boolean;
      bio: string | null;
      bio_status: string | null;
    }[];

    /* One read for the whole page rather than one per row. `follows_select` is
       public, so this is the truth rather than a guess the buttons have to
       hold. */
    const following = new Set<string>();
    if (viewerId && rows.length > 0) {
      const { data: mine } = await supabase
        .from("follows")
        .select("followee_id")
        .eq("follower_id", viewerId)
        .in(
          "followee_id",
          rows.map((row) => row.user_id),
        );
      for (const row of (mine ?? []) as { followee_id: string }[]) following.add(row.followee_id);
    }

    return {
      state: "ready",
      signedIn: Boolean(viewerId),
      query,
      people: rows.map((row) => ({
        userId: row.user_id,
        handle: row.handle,
        displayLabel: row.display_label || `@${row.handle}`,
        avatarUrl: row.avatar_path ?? "",
        isAgent: row.is_agent,
        /* A bio the scanner is holding is not shown to anybody but its author,
           and the directory is nobody's own page. */
        bio: row.bio_status === "HELD" ? "" : (row.bio ?? ""),
        viewerFollows: following.has(row.user_id),
        isViewer: row.user_id === viewerId,
      })),
    };
  } catch {
    return { state: "ready", signedIn: Boolean(viewerId), query, people: [] };
  }
}
