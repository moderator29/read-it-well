import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Item 4, at the read: a deleted post is excluded by every query that lists
 * posts, not hidden by a component after the rows arrived.
 *
 * The fake below is an in-memory table that applies exactly the filters a read
 * asks for and nothing else. It hands the viewer EVERY row, deleted ones
 * included, which is what `posts_select` does for a post's own author
 * (`author_id = auth.uid()` is one of its branches). So a read that forgets to
 * exclude deleted rows returns them here, as it would for the founder on his
 * own profile.
 */

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }));

function builder(table: string) {
  let rows = [...(db.tables[table] ?? [])];
  let head = false;
  const api = {
    select(columns?: string, options?: { head?: boolean }) {
      head = Boolean(options?.head);
      if (columns?.includes("post_media!inner")) {
        rows = rows.filter((row) => Array.isArray(row.post_media) && row.post_media.length > 0);
      }
      return api;
    },
    eq(column: string, value: unknown) {
      rows = rows.filter((row) => row[column] === value);
      return api;
    },
    neq(column: string, value: unknown) {
      rows = rows.filter((row) => row[column] !== value);
      return api;
    },
    is(column: string, value: null) {
      rows = rows.filter((row) => (row[column] ?? null) === value);
      return api;
    },
    not(column: string, op: string, value: null) {
      if (op === "is") rows = rows.filter((row) => (row[column] ?? null) !== value);
      return api;
    },
    in(column: string, values: unknown[]) {
      rows = rows.filter((row) => values.includes(row[column]));
      return api;
    },
    or() {
      return api;
    },
    lt() {
      return api;
    },
    order() {
      return api;
    },
    limit() {
      return api;
    },
    maybeSingle() {
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(
        head ? { count: rows.length, data: null, error: null } : { data: rows, error: null },
      ).then(resolve);
    },
  };
  return api;
}

const fake = { from: (table: string) => builder(table) };

vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => true, SUPABASE_URL: "" }));
vi.mock("../supabase/server", () => ({ createClient: async () => fake }));
vi.mock("../actions/session", () => ({
  resolveSession: async () => ({ state: "signed-in", supabase: fake, user: { id: "me" } }),
}));
vi.mock("./posts-media", () => ({
  listingPhotoUrl: () => null,
  readMediaFor: async () => new Map(),
  signMedia: async (_: unknown, items: { postId: string }[]) =>
    items.map((item) => ({ ...item, url: `signed:${item.postId}` })),
}));

const post = (over: Row): Row => ({
  area_id: null,
  root_id: null,
  parent_id: null,
  depth: 0,
  author_id: "me",
  author_kind: "USER",
  kind: "GIST",
  body: "words",
  listing_id: null,
  payload: null,
  reply_count: 0,
  like_count: 0,
  repost_count: 0,
  view_count: 0,
  status: "LIVE",
  hold_reason: null,
  created_at: "2026-09-20T10:00:00.000Z",
  edited_at: null,
  ...over,
});

const PICTURE = [{ storage_path: "a.jpg", position: 0, width: 1, height: 1 }];

beforeEach(() => {
  db.tables = {
    posts: [
      /* A live post of mine, with a picture. */
      post({ id: "live", post_media: PICTURE }),
      /* Deleted, nobody answered it. Its picture row is what the database
         trigger drops; it is kept here so the read has to exclude the post. */
      post({ id: "gone", status: "REMOVED", body: null, post_media: PICTURE }),
      /* Deleted, but somebody answered it. */
      post({ id: "answered", status: "REMOVED", body: null, reply_count: 1 }),
      post({ id: "their-reply", root_id: "answered", parent_id: "answered", depth: 1, author_id: "them" }),
      /* My replies under `live`: one kept, one deleted with nothing under it,
         one deleted that somebody answered. */
      post({ id: "my-reply", root_id: "live", parent_id: "live", depth: 1 }),
      post({ id: "my-gone-reply", root_id: "live", parent_id: "live", depth: 1, status: "REMOVED", body: null }),
      post({ id: "my-answered-reply", root_id: "live", parent_id: "live", depth: 1, status: "REMOVED", body: null }),
      post({ id: "answer", root_id: "live", parent_id: "my-answered-reply", depth: 2, author_id: "them" }),
    ],
    post_reactions: [
      { post_id: "live", user_id: "me", mark: "LIKE", created_at: "2026-09-20T11:00:00.000Z" },
      { post_id: "gone", user_id: "me", mark: "LIKE", created_at: "2026-09-20T12:00:00.000Z" },
    ],
    stories: [
      { id: "story-gone", author_id: "me", status: "REMOVED", image_path: "s.jpg", headline: "h", created_at: "2026-09-20T10:00:00.000Z" },
      { id: "story-answered", author_id: "me", status: "REMOVED", image_path: "s.jpg", headline: "h", created_at: "2026-09-20T10:00:00.000Z" },
    ],
    story_comments: [
      { id: "c-live", story_id: "story-answered", parent_id: null, author_id: "them", body: "hi", status: "LIVE", like_count: 0, created_at: "2026-09-20T10:00:00.000Z" },
      { id: "c-gone", story_id: "story-answered", parent_id: null, author_id: "me", body: null, status: "REMOVED", like_count: 0, created_at: "2026-09-20T10:00:00.000Z" },
    ],
  };
});

const idsOf = (list: { id: string }[]) => list.map((item) => item.id).sort();

describe("feeds exclude a deleted post", () => {
  it("everywhere", async () => {
    const { getEverywhereFeed } = await import("./posts-queries");
    expect(idsOf((await getEverywhereFeed()).posts)).toEqual(["live"]);
  });

  it("a place's feed", async () => {
    db.tables.posts = db.tables.posts!.map((row) => ({ ...row, area_id: "place" }));
    const { getAreaFeed } = await import("./posts-queries");
    expect(idsOf((await getAreaFeed("place")).posts)).toEqual(["live"]);
  });

  it("Around, the joined feed", async () => {
    const { getJoinedFeed } = await import("./posts-queries");
    expect(idsOf((await getJoinedFeed("me")).posts)).toEqual(["live"]);
  });
});

describe("a profile never shows a deleted post", () => {
  it("the Posts tab", async () => {
    const { getProfileFeed } = await import("./posts-queries");
    expect(idsOf(await getProfileFeed("me"))).toEqual(["live"]);
  });

  it("the Replies tab", async () => {
    const { getProfileReplies } = await import("./posts-queries");
    expect(idsOf(await getProfileReplies("me"))).toEqual(["my-reply"]);
  });

  it("the Media tab", async () => {
    const { getProfileMedia } = await import("./posts-queries");
    expect(idsOf(await getProfileMedia("me"))).toEqual(["live"]);
  });

  it("the media grid", async () => {
    const { getProfileMediaGrid } = await import("./profile-tabs-queries");
    expect((await getProfileMediaGrid("me")).map((tile) => tile.postId)).toEqual(["live"]);
  });

  it("Activity", async () => {
    const { getProfileActivity } = await import("./posts-queries");
    expect((await getProfileActivity("me")).map((entry) => entry.post.id)).toEqual(["live"]);
  });

  it("no card anywhere in a profile read is a tombstone", async () => {
    const q = await import("./posts-queries");
    const all = [
      ...(await q.getProfileFeed("me")),
      ...(await q.getProfileReplies("me")),
      ...(await q.getProfileMedia("me")),
    ];
    expect(all.some((view) => view.removed)).toBe(false);
  });
});

describe("a conversation keeps a tombstone only where somebody replied", () => {
  it("drops a deleted reply nobody answered and keeps the answered one", async () => {
    const { getThread } = await import("./posts-queries");
    const thread = await getThread("live");
    expect(thread).not.toBeNull();
    expect(idsOf(thread!.replies)).toEqual(["answer", "my-answered-reply", "my-reply"]);
    expect(thread!.replies.find((r) => r.id === "my-answered-reply")?.removed).toBe(true);
  });

  it("a deleted root nobody answered is not found", async () => {
    const { getThread } = await import("./posts-queries");
    expect(await getThread("gone")).toBeNull();
  });

  it("a deleted root somebody answered stands as the tombstone", async () => {
    const { getThread } = await import("./posts-queries");
    const thread = await getThread("answered");
    expect(thread?.root.removed).toBe(true);
    expect(thread?.root.body).toBeNull();
    expect(idsOf(thread!.replies)).toEqual(["their-reply"]);
  });

  it("the comments sheet applies the same rule", async () => {
    const { getComments } = await import("./comments-queries");
    const rows = await getComments("live");
    expect(idsOf(rows)).toEqual(["answer", "my-answered-reply", "my-reply"]);
  });
});

describe("stories", () => {
  it("a deleted story with nothing under it is gone", async () => {
    const { getStory } = await import("./stories-queries");
    expect(await getStory("story-gone")).toBeNull();
  });

  it("a deleted story somebody commented on stands as the tombstone, with none of its words", async () => {
    const { getStory } = await import("./stories-queries");
    const story = await getStory("story-answered");
    expect(story?.removed).toBe(true);
    expect(story?.headline).toBe("This story was removed.");
    expect(story?.imageUrl).toBeNull();
    expect(story?.placeLabel).toBeNull();
  });

  it("a deleted comment nobody answered is gone from the story's comments", async () => {
    const { getStoryComments } = await import("./stories-queries");
    expect(idsOf(await getStoryComments("story-answered"))).toEqual(["c-live"]);
  });
});
