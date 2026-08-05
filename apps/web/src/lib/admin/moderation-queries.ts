import "server-only";

import { requireAdmin } from "./guard";

/**
 * Everything the scanner is holding, in one queue.
 *
 * Four kinds of held thing, because the safety triggers can hold four kinds:
 * a post, a story, a comment on a story, and a bio. Until now none of them had
 * a screen, which meant the scanner could hold somebody's words and nobody
 * could release them. A hold with no reviewer is not moderation, it is a
 * deletion with extra steps.
 *
 * Read through the admin's own RLS-bound client. Every one of these tables
 * carries an admin policy in its `for all` form, which is what makes a HELD row
 * visible at all: the member-facing select policies show only LIVE rows and the
 * author's own. The guard in the page is the front door; this is the lock.
 *
 * Oldest first, deliberately, for the same reason the Around queue is. A queue
 * sorted newest first is one where the oldest item rots while the count looks
 * healthy, and the oldest held post is somebody who has been waiting longest.
 */

export type HeldAuthor = {
  handle: string | null;
  label: string | null;
};

export type HeldPost = {
  id: string;
  rootId: string;
  body: string;
  kind: string;
  isReply: boolean;
  areaName: string | null;
  createdAt: string;
  holdReason: string | null;
  author: HeldAuthor;
};

export type HeldStory = {
  id: string;
  headline: string;
  standfirst: string | null;
  placeLabel: string | null;
  areaName: string | null;
  createdAt: string;
  holdReason: string | null;
  author: HeldAuthor;
};

export type HeldStoryComment = {
  id: string;
  storyId: string;
  storyHeadline: string | null;
  body: string;
  createdAt: string;
  holdReason: string | null;
  author: HeldAuthor;
};

export type HeldBio = {
  userId: string;
  handle: string;
  label: string | null;
  bio: string;
  link: string | null;
  updatedAt: string;
};

export type ModerationQueue = {
  posts: HeldPost[];
  stories: HeldStory[];
  comments: HeldStoryComment[];
  bios: HeldBio[];
  /** The one number the console header needs. */
  total: number;
};

const EMPTY: ModerationQueue = { posts: [], stories: [], comments: [], bios: [], total: 0 };

const PAGE = 50;

export async function getModerationQueue(): Promise<ModerationQueue> {
  const access = await requireAdmin();
  if (access.state !== "admin") return EMPTY;
  const db = access.supabase;

  const [postRows, storyRows, commentRows, bioRows] = await Promise.all([
    db
      .from("posts")
      .select("id, root_id, body, kind, parent_id, area_id, created_at, hold_reason, author_id")
      .eq("status", "HELD")
      .order("created_at", { ascending: true })
      .limit(PAGE),
    db
      .from("stories")
      .select(
        "id, headline, standfirst, place_label, area_id, created_at, hold_reason, author_id",
      )
      .eq("status", "HELD")
      .order("created_at", { ascending: true })
      .limit(PAGE),
    db
      .from("story_comments")
      .select("id, story_id, body, created_at, hold_reason, author_id")
      .eq("status", "HELD")
      .order("created_at", { ascending: true })
      .limit(PAGE),
    db
      .from("social_profiles")
      .select("user_id, handle, display_label, bio, link, updated_at")
      .eq("bio_status", "HELD")
      .order("updated_at", { ascending: true })
      .limit(PAGE),
  ]);

  const posts = postRows.data ?? [];
  const stories = storyRows.data ?? [];
  const comments = commentRows.data ?? [];
  const bios = bioRows.data ?? [];

  const authorIds = new Set<string>();
  for (const row of posts) if (row.author_id) authorIds.add(row.author_id);
  for (const row of stories) authorIds.add(row.author_id);
  /* A story comment loses its author when that account is deleted: the column
     is `on delete set null` so the words stay and the name goes. The queue has
     to keep showing it, because a comment nobody owns is exactly the kind a
     moderator still has to decide about. */
  for (const row of comments) if (row.author_id) authorIds.add(row.author_id);

  const areaIds = new Set<string>();
  for (const row of posts) if (row.area_id) areaIds.add(row.area_id);
  for (const row of stories) if (row.area_id) areaIds.add(row.area_id);

  const storyIds = new Set<string>(comments.map((row) => row.story_id));

  const [authorRows, areaRows, storyHeadRows] = await Promise.all([
    authorIds.size > 0
      ? db
          .from("social_profiles")
          .select("user_id, handle, display_label")
          .in("user_id", [...authorIds])
      : Promise.resolve({ data: [] as { user_id: string; handle: string; display_label: string | null }[] }),
    areaIds.size > 0
      ? db.from("areas").select("id, name").in("id", [...areaIds])
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    storyIds.size > 0
      ? db.from("stories").select("id, headline").in("id", [...storyIds])
      : Promise.resolve({ data: [] as { id: string; headline: string }[] }),
  ]);

  const authorById = new Map<string, HeldAuthor>();
  for (const row of authorRows.data ?? []) {
    authorById.set(row.user_id, { handle: row.handle, label: row.display_label ?? null });
  }
  const areaById = new Map<string, string>();
  for (const row of areaRows.data ?? []) areaById.set(row.id, row.name);
  const headlineById = new Map<string, string>();
  for (const row of storyHeadRows.data ?? []) headlineById.set(row.id, row.headline);

  const noAuthor: HeldAuthor = { handle: null, label: null };

  const queue: ModerationQueue = {
    posts: posts.map((row) => ({
      id: row.id,
      rootId: row.root_id ?? row.id,
      body: row.body ?? "",
      kind: row.kind,
      isReply: row.parent_id !== null,
      areaName: row.area_id ? (areaById.get(row.area_id) ?? null) : null,
      createdAt: row.created_at,
      holdReason: row.hold_reason,
      author: row.author_id ? (authorById.get(row.author_id) ?? noAuthor) : noAuthor,
    })),
    stories: stories.map((row) => ({
      id: row.id,
      headline: row.headline,
      standfirst: row.standfirst,
      placeLabel: row.place_label,
      areaName: row.area_id ? (areaById.get(row.area_id) ?? null) : null,
      createdAt: row.created_at,
      holdReason: row.hold_reason,
      author: row.author_id ? (authorById.get(row.author_id) ?? noAuthor) : noAuthor,
    })),
    comments: comments.map((row) => ({
      id: row.id,
      storyId: row.story_id,
      storyHeadline: headlineById.get(row.story_id) ?? null,
      body: row.body,
      createdAt: row.created_at,
      holdReason: row.hold_reason,
      author: row.author_id ? (authorById.get(row.author_id) ?? noAuthor) : noAuthor,
    })),
    bios: bios.map((row) => ({
      userId: row.user_id,
      handle: row.handle,
      label: row.display_label ?? null,
      bio: row.bio ?? "",
      link: row.link,
      updatedAt: row.updated_at,
    })),
    total: 0,
  };

  queue.total =
    queue.posts.length + queue.stories.length + queue.comments.length + queue.bios.length;
  return queue;
}
