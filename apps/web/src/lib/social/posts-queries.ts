import "server-only";

/**
 * Around: reading posts.
 *
 * Every read goes through the caller's own RLS-bound client, so the database
 * decides what a person may see rather than a `where` clause we remembered to
 * write. A blocked author disappears from the feed because `posts_select` says
 * so, not because this file filtered them out, which is the only way a block
 * cannot leak through a count somewhere.
 *
 * Nothing here throws. A feed that 500s because one row is odd is worse than a
 * feed that is briefly short.
 */

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";
import type { PostView } from "@/components/social/feed/PostCard";

const POST_COLUMNS = `
  id, area_id, root_id, parent_id, depth, author_id, author_kind, kind, body,
  listing_id, payload, reply_count, like_count, repost_count, view_count,
  status, hold_reason, created_at, edited_at
`;

type RawPost = {
  id: string;
  area_id: string | null;
  root_id: string | null;
  parent_id: string | null;
  depth: number;
  author_id: string | null;
  author_kind: "USER" | "BOT" | "SYSTEM";
  kind: "GIST" | "ASK" | "REPLY" | "SHOWCASE" | "SYSTEM";
  body: string | null;
  listing_id: string | null;
  payload: unknown;
  reply_count: number;
  like_count: number;
  repost_count: number;
  view_count: number;
  status: "LIVE" | "HELD" | "REMOVED";
  hold_reason: string | null;
  created_at: string;
  edited_at: string | null;
};

/**
 * Relative time, in the shortest honest form.
 *
 * Deliberately not a library. Four branches and a date is the whole
 * requirement, and Lagos is the only timezone this product cares about, which
 * `formatDate` does not default to yet (R-108).
 */
function whenLabel(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

type Enrichment = {
  authors: Map<
    string,
    { handle: string | null; displayLabel: string | null; avatarPath: string | null; isAgent: boolean }
  >;
  moderatorAreas: Map<string, string>;
  liked: Set<string>;
  saved: Set<string>;
  reposted: Set<string>;
  areas: Map<string, { name: string; slug: string }>;
};

/**
 * One round of lookups for a whole page of posts, rather than a query per card.
 * Six small reads instead of six times the number of rows.
 */
async function enrich(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: RawPost[],
  viewerId: string | null,
): Promise<Enrichment> {
  const authorIds = [...new Set(rows.map((r) => r.author_id).filter((v): v is string => Boolean(v)))];
  const areaIds = [...new Set(rows.map((r) => r.area_id).filter((v): v is string => Boolean(v)))];
  const postIds = rows.map((r) => r.id);

  const [profiles, areas, mods, reactions, reposts] = await Promise.all([
    authorIds.length
      ? supabase
          .from("social_profiles")
          .select("user_id, handle, display_label, avatar_path, is_agent")
          .in("user_id", authorIds)
      : Promise.resolve({ data: [] as never[] }),
    areaIds.length
      ? supabase.from("areas").select("id, name, slug").in("id", areaIds)
      : Promise.resolve({ data: [] as never[] }),
    authorIds.length && areaIds.length
      ? supabase
          .from("area_members")
          .select("user_id, area_id")
          .eq("role", "MODERATOR")
          .in("user_id", authorIds)
          .in("area_id", areaIds)
      : Promise.resolve({ data: [] as never[] }),
    viewerId && postIds.length
      ? supabase
          .from("post_reactions")
          .select("post_id, mark")
          .eq("user_id", viewerId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as never[] }),
    viewerId && postIds.length
      ? supabase
          .from("post_reposts")
          .select("post_id")
          .eq("user_id", viewerId)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const authors = new Map<string, ReturnType<() => Enrichment["authors"] extends Map<string, infer V> ? V : never>>();
  for (const p of (profiles.data ?? []) as {
    user_id: string;
    handle: string | null;
    display_label: string | null;
    avatar_path: string | null;
    is_agent: boolean;
  }[]) {
    authors.set(p.user_id, {
      handle: p.handle,
      displayLabel: p.display_label,
      avatarPath: p.avatar_path,
      isAgent: p.is_agent,
    });
  }

  const areaMap = new Map<string, { name: string; slug: string }>();
  for (const a of (areas.data ?? []) as { id: string; name: string; slug: string }[]) {
    areaMap.set(a.id, { name: a.name, slug: a.slug });
  }

  const moderatorAreas = new Map<string, string>();
  for (const m of (mods.data ?? []) as { user_id: string; area_id: string }[]) {
    moderatorAreas.set(`${m.user_id}:${m.area_id}`, m.area_id);
  }

  const liked = new Set<string>();
  const saved = new Set<string>();
  for (const r of (reactions.data ?? []) as { post_id: string; mark: string }[]) {
    if (r.mark === "LIKE") liked.add(r.post_id);
    if (r.mark === "SAVE") saved.add(r.post_id);
  }

  const reposted = new Set<string>(
    ((reposts.data ?? []) as { post_id: string }[]).map((r) => r.post_id),
  );

  return { authors, moderatorAreas, liked, saved, reposted, areas: areaMap };
}

function toView(row: RawPost, e: Enrichment, viewerId: string | null): PostView {
  const author = row.author_id ? (e.authors.get(row.author_id) ?? null) : null;
  const area = row.area_id ? (e.areas.get(row.area_id) ?? null) : null;
  const isMine = Boolean(viewerId && row.author_id === viewerId);

  return {
    id: row.id,
    kind: row.kind,
    authorKind: row.author_kind,
    author: author && row.author_id
      ? {
          id: row.author_id,
          handle: author.handle,
          displayLabel: author.displayLabel,
          avatarPath: author.avatarPath,
          isAgent: author.isAgent,
          moderatorOf:
            row.author_id && row.area_id && e.moderatorAreas.has(`${row.author_id}:${row.area_id}`)
              ? (area?.name ?? null)
              : null,
        }
      : null,
    // A removed post keeps its place in a thread and loses its words. Deleting
    // the row would take other people's replies with it.
    body: row.status === "REMOVED" ? null : row.body,
    createdLabel: whenLabel(row.created_at),
    edited: Boolean(row.edited_at),
    areaName: area?.name ?? null,
    areaSlug: area?.slug ?? null,
    listing: null,
    sourceNote: null,
    replyingTo: null,
    repostedBy: null,
    replyCount: row.reply_count,
    likeCount: row.like_count,
    repostCount: row.repost_count,
    viewCount: row.view_count,
    liked: e.liked.has(row.id),
    reposted: e.reposted.has(row.id),
    saved: e.saved.has(row.id),
    // The hold reason is only ever handed to the post's own author. The RLS
    // policy already refuses the row to anybody else, and this is the second
    // lock on the same door.
    heldReason: row.status === "HELD" && isMine ? row.hold_reason : null,
    isMine,
  };
}

export type FeedPage = {
  posts: PostView[];
  /** The created_at of the last row, for the next page. Null when the feed ends. */
  cursor: string | null;
  ended: boolean;
};

const PAGE_SIZE = 20;

/**
 * A place's feed. Roots only: replies belong to their thread, not to the
 * timeline, or the same conversation appears four times.
 *
 * Cursor pagination on created_at rather than offset, so a post arriving while
 * somebody reads cannot shift a page under them and make them see a row twice.
 */
export async function getAreaFeed(
  areaId: string,
  cursor?: string,
): Promise<FeedPage> {
  if (!isSupabaseConfigured()) return { posts: [], cursor: null, ended: true };

  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;

  let query = supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("area_id", areaId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error || !data) return { posts: [], cursor: null, ended: true };

  const rows = data as unknown as RawPost[];
  const ended = rows.length <= PAGE_SIZE;
  const page = ended ? rows : rows.slice(0, PAGE_SIZE);
  if (page.length === 0) return { posts: [], cursor: null, ended: true };

  const e = await enrich(supabase, page, viewerId);
  const last = page[page.length - 1];
  return {
    posts: page.map((row) => toView(row, e, viewerId)),
    cursor: ended || !last ? null : last.created_at,
    ended,
  };
}

export type Thread = {
  root: PostView;
  replies: (PostView & { depth: number })[];
};

/**
 * One post and everything under it.
 *
 * Read in one query on root_id rather than walking the tree, which is exactly
 * what root_id is denormalised for. Depth is capped at three by trigger, so the
 * whole thread is bounded and there is no pagination to design here yet.
 */
export async function getThread(postId: string): Promise<Thread | null> {
  if (!isSupabaseConfigured()) return null;

  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;

  const { data: rootRow, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("id", postId)
    .maybeSingle();
  if (error || !rootRow) return null;

  const root = rootRow as unknown as RawPost;
  // Opening a reply shows its whole thread from the top, so the answer always
  // arrives with the question rather than on its own.
  const rootId = root.root_id ?? root.id;

  const [topRes, repliesRes] = await Promise.all([
    rootId === root.id
      ? Promise.resolve({ data: rootRow })
      : supabase.from("posts").select(POST_COLUMNS).eq("id", rootId).maybeSingle(),
    supabase
      .from("posts")
      .select(POST_COLUMNS)
      .eq("root_id", rootId)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  const top = (topRes.data ?? rootRow) as unknown as RawPost;
  const replyRows = (repliesRes.data ?? []) as unknown as RawPost[];

  const e = await enrich(supabase, [top, ...replyRows], viewerId);
  const byId = new Map(replyRows.map((r) => [r.id, r]));

  return {
    root: toView(top, e, viewerId),
    replies: replyRows.map((row) => {
      const view = toView(row, e, viewerId);
      const parent = row.parent_id ? byId.get(row.parent_id) : null;
      const parentAuthor = parent?.author_id ? e.authors.get(parent.author_id) : null;
      return {
        ...view,
        // Only say who a reply answers when it is not the obvious one. Every
        // reply saying "replying to the person above" is noise.
        replyingTo:
          parent && parent.id !== top.id
            ? parentAuthor?.handle
              ? `@${parentAuthor.handle}`
              : parent.author_kind === "BOT"
                ? "RentMe AI"
                : null
            : null,
        depth: row.depth,
      };
    }),
  };
}

const PROFILE_LIMIT = 40;

/**
 * The three reads behind a profile's tabs.
 *
 * They are three functions rather than one with a mode, because each has a
 * different `where` and a different shape of answer, and a single function with
 * a switch would hide that a Replies row needs a parent lookup a Posts row does
 * not. What they share is the client, the enrichment and the view mapping, so
 * a change to how a card reads lands on all three at once.
 *
 * Every one goes through the caller's own RLS-bound client, so somebody's page
 * shows a stranger exactly what `posts_select` allows a stranger to see, and
 * shows the person themselves their own held posts, without either rule being
 * written here.
 */
async function profileClient() {
  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;
  return { supabase, viewerId };
}

/** Somebody's own posts, for their profile. Roots only, as the timeline is. */
export async function getProfileFeed(userId: string): Promise<PostView[]> {
  if (!isSupabaseConfigured()) return [];

  const { supabase, viewerId } = await profileClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("author_id", userId)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(PROFILE_LIMIT);

  if (error || !data) return [];
  const rows = data as unknown as RawPost[];
  if (rows.length === 0) return [];

  const e = await enrich(supabase, rows, viewerId);
  return rows.map((row) => toView(row, e, viewerId));
}

/**
 * Somebody's replies.
 *
 * Each one carries who it answers, because a reply shown away from its thread
 * is half a sentence. The parents are read in one extra query for the whole
 * page, not one per row, and a parent that the viewer may not see comes back
 * missing rather than as an error: `posts_select` refuses it, the reply still
 * renders, and the line above it simply says nothing rather than naming
 * somebody this viewer is not allowed to know about.
 */
export async function getProfileReplies(userId: string): Promise<PostView[]> {
  if (!isSupabaseConfigured()) return [];

  const { supabase, viewerId } = await profileClient();

  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("author_id", userId)
    .not("parent_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(PROFILE_LIMIT);

  if (error || !data) return [];
  const rows = data as unknown as RawPost[];
  if (rows.length === 0) return [];

  const parentIds = [...new Set(rows.map((r) => r.parent_id).filter((v): v is string => Boolean(v)))];
  const { data: parents } = parentIds.length
    ? await supabase.from("posts").select("id, author_id, author_kind").in("id", parentIds)
    : { data: [] as never[] };

  const parentRows = (parents ?? []) as { id: string; author_id: string | null; author_kind: string }[];
  const parentById = new Map(parentRows.map((p) => [p.id, p]));

  /* One more lookup for the parents' handles. The page's own enrichment covers
     the reply authors, which on a profile is one person, and says nothing about
     the people being answered. */
  const parentAuthorIds = [
    ...new Set(parentRows.map((p) => p.author_id).filter((v): v is string => Boolean(v))),
  ];
  const { data: parentProfiles } = parentAuthorIds.length
    ? await supabase.from("social_profiles").select("user_id, handle").in("user_id", parentAuthorIds)
    : { data: [] as never[] };
  const handleById = new Map(
    ((parentProfiles ?? []) as { user_id: string; handle: string | null }[]).map((p) => [
      p.user_id,
      p.handle,
    ]),
  );

  const e = await enrich(supabase, rows, viewerId);

  return rows.map((row) => {
    const parent = row.parent_id ? parentById.get(row.parent_id) : null;
    const handle = parent?.author_id ? handleById.get(parent.author_id) : null;
    return {
      ...toView(row, e, viewerId),
      replyingTo: handle
        ? `@${handle}`
        : parent?.author_kind === "BOT"
          ? "RentMe AI"
          : null,
    };
  });
}

/**
 * Somebody's posts that carry a picture.
 *
 * `post_media!inner` makes the join do the filtering, so a post with no media
 * never comes back at all. Doing it the other way round, reading `post_media`
 * first and then the posts, would need a second query and would still have to
 * pass `posts_select`, which is where the answer has to come from anyway.
 *
 * Replies are included here, unlike the Posts tab. A picture is a picture
 * wherever somebody put it, and a media grid that silently drops the ones
 * posted inside a conversation would be missing most of them.
 */
export async function getProfileMedia(userId: string): Promise<PostView[]> {
  if (!isSupabaseConfigured()) return [];

  const { supabase, viewerId } = await profileClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_COLUMNS}, post_media!inner(id)`)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(PROFILE_LIMIT);

  if (error || !data) return [];
  const rows = data as unknown as RawPost[];
  if (rows.length === 0) return [];

  const e = await enrich(supabase, rows, viewerId);
  return rows.map((row) => toView(row, e, viewerId));
}
