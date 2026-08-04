import "server-only";

/**
 * The comments under something.
 *
 * A comment is a reply, and a reply is a post, so this reads the same `posts`
 * rows the thread view reads and shapes them for a denser surface. It exists as
 * its own module rather than as a mode on `getThread` because a comments sheet
 * needs two things a thread page does not: the parent of every row so the sheet
 * can draw the nesting, and nothing else at all, since a sheet has no room for
 * an area chip, a listing plate or a held banner.
 *
 * Depth is capped at three by trigger, so the whole set is bounded and there is
 * no pagination to design here. `posts_select` decides what comes back, which
 * is why a blocked person's comment is simply absent rather than filtered out
 * in this file.
 */

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";

export type ThreadComment = {
  id: string;
  parentId: string | null;
  depth: number;
  body: string | null;
  createdLabel: string;
  authorId: string | null;
  authorLabel: string;
  authorHandle: string | null;
  avatarUrl: string;
  likeCount: number;
  liked: boolean;
  isMine: boolean;
  /** True when the row is a tombstone: removed, and holding its place. */
  removed: boolean;
};

export async function getComments(rootId: string): Promise<ThreadComment[]> {
  if (!isSupabaseConfigured()) return [];

  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, parent_id, depth, author_id, body, status, like_count, created_at")
      .eq("root_id", rootId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error || !data || data.length === 0) return [];

    const rows = data as unknown as {
      id: string;
      parent_id: string | null;
      depth: number;
      author_id: string | null;
      body: string | null;
      status: string;
      like_count: number;
      created_at: string;
    }[];

    const authorIds = [
      ...new Set(rows.map((row) => row.author_id).filter((v): v is string => Boolean(v))),
    ];

    const [profiles, likes] = await Promise.all([
      authorIds.length
        ? supabase
            .from("social_profiles")
            .select("user_id, handle, display_label, avatar_path")
            .in("user_id", authorIds)
        : Promise.resolve({ data: [] as never[] }),
      viewerId
        ? supabase
            .from("post_reactions")
            .select("post_id")
            .eq("user_id", viewerId)
            .eq("mark", "LIKE")
            .in(
              "post_id",
              rows.map((row) => row.id),
            )
        : Promise.resolve({ data: [] as never[] }),
    ]);

    const byId = new Map(
      ((profiles.data ?? []) as {
        user_id: string;
        handle: string;
        display_label: string | null;
        avatar_path: string | null;
      }[]).map((p) => [p.user_id, p]),
    );
    const likedSet = new Set(
      ((likes.data ?? []) as { post_id: string }[]).map((row) => row.post_id),
    );

    return rows.map((row) => {
      const author = row.author_id ? byId.get(row.author_id) : null;
      const removed = row.status === "REMOVED";
      return {
        id: row.id,
        parentId: row.parent_id,
        depth: row.depth,
        /* A removed comment keeps its place so the replies under it do not
           orphan into a conversation with no top. It loses its words, not its
           row. */
        body: removed ? null : row.body,
        createdLabel: shortWhen(row.created_at),
        authorId: row.author_id,
        authorLabel:
          author?.display_label || (author ? `@${author.handle}` : "Somebody who left"),
        authorHandle: author?.handle ?? null,
        avatarUrl: author?.avatar_path ?? "",
        likeCount: row.like_count,
        liked: likedSet.has(row.id),
        isMine: Boolean(viewerId && row.author_id === viewerId),
        removed,
      };
    });
  } catch {
    return [];
  }
}

/** "4m", "2h", "3d", then a date. The shortest honest form. */
function shortWhen(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
