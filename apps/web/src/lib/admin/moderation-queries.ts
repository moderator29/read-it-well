import "server-only";

import { requireAdmin } from "./guard";
import {
  isNarrowed,
  lagosDayEnd,
  lagosDayStart,
  orSafe,
  type AdminQueueFilter,
} from "./queue-filter";

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
  /** True when a search term or a date range is narrowing all four reads. */
  narrowed: boolean;
};

const EMPTY: ModerationQueue = {
  posts: [],
  stories: [],
  comments: [],
  bios: [],
  total: 0,
  narrowed: false,
};

const PAGE = 50;

/**
 * The four reads, narrowed together.
 *
 * ---------------------------------------------------------------------------
 * THIS QUEUE HAD NO WAY TO FIND ANYTHING IN IT.
 *
 * Four tables, oldest first, fifty each, and nothing else. It is the screen a
 * moderator opens when somebody rings up about a post that was held, and the
 * only way to find that post was to read the page. F2-055 counted nineteen
 * destinations with one search box between them; twelve had the shared frame by
 * the time this sprint reached here, and this was not one of them.
 *
 * THE STATUS AXIS IS FIXED AND THE PAGE DRAWS NO CHIPS. Every row on all four
 * tables is `HELD` by definition: that is what the queue is. A status control
 * here would offer one value, which is not a filter.
 *
 * THE SEARCH GOES WHERE THE WORDS ARE, which is a different column on each
 * table: a post's body, a story's headline and standfirst, a comment's body, a
 * bio's text. A moderator searching "generator" means the words that were held,
 * not a uuid, so there is no id branch here and no pretence of one.
 *
 * NO PAGER, AND THAT IS A GAP RATHER THAN A DECISION. Four independent tables
 * cannot share one offset honestly: `?offset=40` would mean the forty-first
 * post AND the forty-first bio, and Next would be offered whenever any one of
 * the four came back full. Each list is still capped at fifty. Where that cap
 * bites, the narrowing above is what reaches past it, and the page says the cap
 * out loud rather than letting fifty look like all.
 */
export async function getModerationQueue(
  filter?: AdminQueueFilter,
): Promise<ModerationQueue> {
  const access = await requireAdmin();
  if (access.state !== "admin") return EMPTY;
  const db = access.supabase;

  const term = (filter?.q ?? "").trim();
  const narrowed = isNarrowed(filter);
  /* `%` is safe: PostgREST treats the value of an `ilike` as data, so a term
     containing one searches for a literal `%` rather than matching everything.
     A COMMA IS NOT, inside `.or()`, which is why `orLike` exists beside this.
     See `orSafe` in `queue-filter` for what that grammar does with one. */
  const like = `%${term}%`;
  const orLike = orSafe(like);

  let postSelect = db
    .from("posts")
    .select("id, root_id, body, kind, parent_id, area_id, created_at, hold_reason, author_id")
    .eq("status", "HELD");
  let storySelect = db
    .from("stories")
    .select("id, headline, standfirst, place_label, area_id, created_at, hold_reason, author_id")
    .eq("status", "HELD");
  let commentSelect = db
    .from("story_comments")
    .select("id, story_id, body, created_at, hold_reason, author_id")
    .eq("status", "HELD");
  let bioSelect = db
    .from("social_profiles")
    .select("user_id, handle, display_label, bio, link, updated_at")
    .eq("bio_status", "HELD");

  if (term.length > 0) {
    postSelect = postSelect.ilike("body", like);
    /* A story's words are split across two columns and a moderator does not
       know or care which one held the phrase they were told about. */
    storySelect = storySelect.or(`headline.ilike.${orLike},standfirst.ilike.${orLike}`);
    commentSelect = commentSelect.ilike("body", like);
    /* The handle is searchable here and only here, because it is the only one
       of the four rows whose subject IS the person rather than something they
       wrote once. */
    bioSelect = bioSelect.or(`bio.ilike.${orLike},handle.ilike.${orLike}`);
  }

  /* The date each table actually stamps. Three of them are written once and one
     is a profile that is edited in place, so a bio's range is its last edit,
     which is the moment the hold was triggered. Lagos days: see
     `lagosDayStart`, a bare date is read as UTC midnight and is an hour late
     here, so a row held at half past midnight falls outside its own day. */
  if (filter?.from) {
    const start = lagosDayStart(filter.from);
    postSelect = postSelect.gte("created_at", start);
    storySelect = storySelect.gte("created_at", start);
    commentSelect = commentSelect.gte("created_at", start);
    bioSelect = bioSelect.gte("updated_at", start);
  }
  if (filter?.to) {
    const end = lagosDayEnd(filter.to);
    postSelect = postSelect.lte("created_at", end);
    storySelect = storySelect.lte("created_at", end);
    commentSelect = commentSelect.lte("created_at", end);
    bioSelect = bioSelect.lte("updated_at", end);
  }

  const [postRows, storyRows, commentRows, bioRows] = await Promise.all([
    postSelect.order("created_at", { ascending: true }).limit(PAGE),
    storySelect.order("created_at", { ascending: true }).limit(PAGE),
    commentSelect.order("created_at", { ascending: true }).limit(PAGE),
    bioSelect.order("updated_at", { ascending: true }).limit(PAGE),
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
    narrowed,
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
