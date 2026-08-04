import "server-only";

/**
 * Reading stories.
 *
 * A story is its own object now, with its own table, so every read here is
 * against `public.stories` and its four companions rather than against `posts`.
 * What it shares with the rest of the platform is the things that should be
 * shared: `private.blocked_with` still hides a blocked author, the picture
 * still lives in the private `social-media` bucket behind a signed URL, and the
 * counters are still triggers rather than anything this file counts.
 *
 * **Every read is failure tolerant on 42P01.** The tables are being applied as
 * this is written, and a story surface that 500s before its migration lands is
 * worse than one that says "shortly" for an hour. An empty answer here always
 * renders a designed state, never a blank.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";
import type { Database } from "../supabase/database.types";
import { signMedia } from "./posts-media";
import { readMutes } from "./posts-queries";

/* The generated types are regenerated after a migration, not before it. */
type Loose = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (supabase: Loose) => supabase as any;

async function reader() {
  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;
  return { supabase, viewerId };
}

export type StoryAuthor = {
  id: string | null;
  handle: string | null;
  label: string;
  avatarUrl: string;
  isAgent: boolean;
};

export type StoryView = {
  id: string;
  headline: string;
  standfirst: string | null;
  placeLabel: string | null;
  imageUrl: string | null;
  author: StoryAuthor;
  createdLabel: string;
  edited: boolean;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  viewCount: number;
  liked: boolean;
  saved: boolean;
  isMine: boolean;
  removed: boolean;
  /** Only ever handed to the story's own author. */
  heldReason: string | null;
  areaSlug: string | null;
  areaName: string | null;
};

/** A story in a list: the rail, the profile tab, the area feed. */
export type StoryCard = {
  id: string;
  headline: string;
  placeLabel: string | null;
  imageUrl: string | null;
  authorLabel: string;
  authorHandle: string | null;
  createdLabel: string;
  likeCount: number;
};

export type Face = {
  userId: string;
  label: string;
  handle: string | null;
  avatarUrl: string;
};

export type StoryFaces = { faces: Face[]; overflow: number };

const STORY_COLUMNS = `
  id, author_id, area_id, listing_id, image_path, headline, standfirst,
  place_label, status, hold_reason, like_count, save_count, comment_count,
  view_count, created_at, edited_at
`;

type StoryRow = {
  id: string;
  author_id: string | null;
  area_id: string | null;
  listing_id: string | null;
  image_path: string;
  headline: string;
  standfirst: string | null;
  place_label: string | null;
  status: string;
  hold_reason: string | null;
  like_count: number;
  save_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  edited_at: string | null;
};

/* ------------------------------------------------------------- one story */

export async function getStory(storyId: string): Promise<StoryView | null> {
  if (!isSupabaseConfigured()) return null;
  const { supabase, viewerId } = await reader();

  try {
    const { data, error } = await loose(supabase)
      .from("stories")
      .select(STORY_COLUMNS)
      .eq("id", storyId)
      .maybeSingle();
    if (error || !data) return null;

    const row = data as StoryRow;
    const isMine = Boolean(viewerId && row.author_id === viewerId);

    const [authors, media, marks, area] = await Promise.all([
      readAuthors(supabase, row.author_id ? [row.author_id] : []),
      signMedia(supabase, [
        { postId: row.id, storagePath: row.image_path, width: null, height: null },
      ]),
      readViewerMarks(supabase, viewerId, [row.id]),
      readArea(supabase, row.area_id),
    ]);

    return {
      id: row.id,
      headline: row.headline,
      /* A removed story keeps its place and loses its words, exactly as a
         removed post does, so a link somebody shared does not 404 into
         nothing. */
      standfirst: row.status === "REMOVED" ? null : row.standfirst,
      placeLabel: row.place_label,
      imageUrl: row.status === "REMOVED" ? null : (media[0]?.url ?? null),
      author: authors.get(row.author_id ?? "") ?? {
        id: row.author_id,
        handle: null,
        label: "Somebody who left",
        avatarUrl: "",
        isAgent: false,
      },
      createdLabel: dayLabel(row.created_at),
      edited: Boolean(row.edited_at),
      likeCount: row.like_count,
      saveCount: row.save_count,
      commentCount: row.comment_count,
      viewCount: row.view_count,
      liked: marks.liked.has(row.id),
      saved: marks.saved.has(row.id),
      isMine,
      removed: row.status === "REMOVED",
      heldReason: row.status === "HELD" && isMine ? row.hold_reason : null,
      areaSlug: area?.slug ?? null,
      areaName: area?.name ?? null,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- many stories */

export async function listStories(options: {
  areaId?: string;
  authorId?: string;
  limit?: number;
}): Promise<StoryCard[]> {
  if (!isSupabaseConfigured()) return [];
  const { supabase, viewerId } = await reader();
  const limit = options.limit ?? 12;

  try {
    let query = loose(supabase)
      .from("stories")
      .select(
        "id, author_id, image_path, headline, place_label, like_count, created_at, status",
      )
      .eq("status", "LIVE")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options.areaId) query = query.eq("area_id", options.areaId);
    if (options.authorId) query = query.eq("author_id", options.authorId);

    const [{ data, error }, muted] = await Promise.all([query, readMutes(supabase, viewerId)]);
    if (error || !data || data.length === 0) return [];

    const rows = (data as {
      id: string;
      author_id: string | null;
      image_path: string;
      headline: string;
      place_label: string | null;
      like_count: number;
      created_at: string;
    }[]).filter(
      /* A mute is a promise that this person stops appearing in what you are
         shown, and a story rail is exactly that. Their own page is not, which
         is why `authorId` reads are left alone: you went there on purpose. */
      (row) =>
        Boolean(options.authorId) ||
        !(row.author_id && muted.users.has(row.author_id)),
    );
    if (rows.length === 0) return [];

    const [authors, media] = await Promise.all([
      readAuthors(
        supabase,
        [...new Set(rows.map((r) => r.author_id).filter((v): v is string => Boolean(v)))],
      ),
      signMedia(
        supabase,
        rows.map((r) => ({
          postId: r.id,
          storagePath: r.image_path,
          width: null,
          height: null,
        })),
      ),
    ]);
    const urlById = new Map(media.map((item) => [item.postId, item.url]));

    return rows.map((row) => {
      const author = row.author_id ? authors.get(row.author_id) : null;
      return {
        id: row.id,
        headline: row.headline,
        placeLabel: row.place_label,
        imageUrl: urlById.get(row.id) ?? null,
        authorLabel: author?.label ?? "Somebody who left",
        authorHandle: author?.handle ?? null,
        createdLabel: dayLabel(row.created_at),
        likeCount: row.like_count,
      };
    });
  } catch {
    return [];
  }
}

/** How many stories somebody has, for the count beside the tab. */
export async function countStories(authorId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const { supabase } = await reader();
  try {
    const { count, error } = await loose(supabase)
      .from("stories")
      .select("id", { count: "exact", head: true })
      .eq("author_id", authorId)
      .eq("status", "LIVE");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------- the facepile */

/**
 * Who liked a story, and how many did not fit.
 *
 * The overflow comes from the story's own `like_count` rather than from
 * counting rows, because that counter is a trigger and is the number shown
 * beside the heart. Counting the rows this query could see would disagree with
 * it the moment a block hid one of them, and two numbers for one fact is worse
 * than a number and a pile that is shorter than it.
 */
export async function getStoryFaces(
  storyId: string,
  likeCount: number,
  take = 5,
): Promise<StoryFaces> {
  if (!isSupabaseConfigured()) return { faces: [], overflow: 0 };
  const { supabase } = await reader();

  try {
    const { data, error } = await loose(supabase)
      .from("story_reactions")
      .select("user_id, created_at")
      .eq("story_id", storyId)
      .eq("mark", "LIKE")
      .order("created_at", { ascending: false })
      .limit(take);
    if (error || !data || data.length === 0) {
      return { faces: [], overflow: Math.max(0, likeCount) };
    }

    const ids = (data as { user_id: string }[]).map((row) => row.user_id);
    const authors = await readAuthors(supabase, ids);

    /* Somebody a block hides has no profile row here, so they leave no face.
       They still count towards the number beside the heart, which is the honest
       outcome: the count is real and the pile is only who we can show. */
    const faces: Face[] = ids
      .map((id): Face | null => {
        const author = authors.get(id);
        if (!author) return null;
        return {
          userId: id,
          label: author.label,
          handle: author.handle,
          avatarUrl: author.avatarUrl,
        };
      })
      .filter((face): face is Face => face !== null);

    return { faces, overflow: Math.max(0, likeCount - faces.length) };
  } catch {
    return { faces: [], overflow: 0 };
  }
}

/* ------------------------------------------------------------- the comments */

export type StoryComment = {
  id: string;
  parentId: string | null;
  body: string | null;
  createdLabel: string;
  authorId: string | null;
  authorLabel: string;
  authorHandle: string | null;
  avatarUrl: string;
  likeCount: number;
  liked: boolean;
  isMine: boolean;
  removed: boolean;
};

/**
 * A story's comments.
 *
 * One level of nesting, through `parent_id`, which is what the sheet's curved
 * connector draws. Read in one query and shaped here, so the sheet is layout
 * and holds no knowledge of where its rows came from: the same component
 * renders these and a post's replies.
 */
export async function getStoryComments(storyId: string): Promise<StoryComment[]> {
  if (!isSupabaseConfigured()) return [];
  const { supabase, viewerId } = await reader();

  try {
    const { data, error } = await loose(supabase)
      .from("story_comments")
      .select("id, parent_id, author_id, body, status, like_count, created_at")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error || !data || data.length === 0) return [];

    const rows = data as {
      id: string;
      parent_id: string | null;
      author_id: string | null;
      body: string | null;
      status: string;
      like_count: number;
      created_at: string;
    }[];

    const [authors, liked] = await Promise.all([
      readAuthors(
        supabase,
        [...new Set(rows.map((r) => r.author_id).filter((v): v is string => Boolean(v)))],
      ),
      readViewerCommentLikes(
        supabase,
        viewerId,
        rows.map((r) => r.id),
      ),
    ]);

    return rows.map((row) => {
      const author = row.author_id ? authors.get(row.author_id) : null;
      const removed = row.status === "REMOVED";
      return {
        id: row.id,
        parentId: row.parent_id,
        body: removed ? null : row.body,
        createdLabel: shortWhen(row.created_at),
        authorId: row.author_id,
        authorLabel: author?.label ?? "Somebody who left",
        authorHandle: author?.handle ?? null,
        avatarUrl: author?.avatarUrl ?? "",
        likeCount: row.like_count,
        liked: liked.has(row.id),
        isMine: Boolean(viewerId && row.author_id === viewerId),
        removed,
      };
    });
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ helpers */

async function readAuthors(
  supabase: Loose,
  ids: string[],
): Promise<Map<string, StoryAuthor>> {
  const out = new Map<string, StoryAuthor>();
  if (ids.length === 0) return out;
  try {
    const { data } = await supabase
      .from("social_profiles")
      .select("user_id, handle, display_label, avatar_path, is_agent")
      .in("user_id", ids);
    for (const row of (data ?? []) as {
      user_id: string;
      handle: string;
      display_label: string | null;
      avatar_path: string | null;
      is_agent: boolean;
    }[]) {
      out.set(row.user_id, {
        id: row.user_id,
        handle: row.handle,
        label: row.display_label || `@${row.handle}`,
        avatarUrl: row.avatar_path ?? "",
        isAgent: row.is_agent,
      });
    }
    return out;
  } catch {
    return out;
  }
}

async function readViewerMarks(
  supabase: Loose,
  viewerId: string | null,
  storyIds: string[],
): Promise<{ liked: Set<string>; saved: Set<string> }> {
  const liked = new Set<string>();
  const saved = new Set<string>();
  if (!viewerId || storyIds.length === 0) return { liked, saved };
  try {
    const { data } = await loose(supabase)
      .from("story_reactions")
      .select("story_id, mark")
      .eq("user_id", viewerId)
      .in("story_id", storyIds);
    for (const row of (data ?? []) as { story_id: string; mark: string }[]) {
      if (row.mark === "LIKE") liked.add(row.story_id);
      if (row.mark === "SAVE") saved.add(row.story_id);
    }
  } catch {
    /* Not marked is the safe answer: the control then does something. */
  }
  return { liked, saved };
}

async function readViewerCommentLikes(
  supabase: Loose,
  viewerId: string | null,
  commentIds: string[],
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!viewerId || commentIds.length === 0) return out;
  try {
    const { data } = await loose(supabase)
      .from("story_comment_reactions")
      .select("comment_id")
      .eq("user_id", viewerId)
      .in("comment_id", commentIds);
    for (const row of (data ?? []) as { comment_id: string }[]) out.add(row.comment_id);
  } catch {
    /* As above. */
  }
  return out;
}

async function readArea(
  supabase: Loose,
  areaId: string | null,
): Promise<{ slug: string; name: string } | null> {
  if (!areaId) return null;
  try {
    const { data } = await supabase
      .from("areas")
      .select("slug, name")
      .eq("id", areaId)
      .maybeSingle();
    return data ? { slug: data.slug, name: data.name } : null;
  } catch {
    return null;
  }
}

/** "Today", "Yesterday", "12 May". A story is not measured in minutes. */
function dayLabel(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days === 1) return "Yesterday";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      ...(days > 300 ? { year: "numeric" } : {}),
      timeZone: "Africa/Lagos",
    }).format(then);
  } catch {
    return "";
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
