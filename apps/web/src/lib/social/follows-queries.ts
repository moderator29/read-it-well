import "server-only";

/**
 * Who follows whom, as a page somebody can actually open.
 *
 * `follows_select` is public and both counts increment for real, so a number on
 * a profile has to lead somewhere. A count that is not a link is a dead end
 * wearing a number.
 *
 * Two queries rather than a join, and deliberately.
 *
 * `public.follows` carries no foreign key to `public.social_profiles` (it
 * points at `auth.users`), so PostgREST has no relationship to embed and
 * `select("*, social_profiles(...)")` would simply fail. Reading the follow
 * rows first and then the profiles behind them is not a workaround, it is the
 * shape the schema actually has, and it costs one extra round trip for a whole
 * page of people rather than one per person.
 *
 * The consequence worth stating: a follow row whose profile does not come back
 * is dropped from the list. That happens when a block touches the pair in
 * either direction, because `social_profiles_select` carries
 * `not private.blocked_with(user_id)`. So a list can be shorter than the count
 * beside it. That is the honest outcome of bidirectional invisibility, and the
 * alternative, a row saying "somebody you cannot see", would leak the existence
 * of exactly the person the block is meant to hide.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";
import type { Database } from "../supabase/database.types";

export type FollowDirection = "followers" | "following";

export type FollowRow = {
  userId: string;
  handle: string;
  displayLabel: string;
  avatarUrl: string;
  isAgent: boolean;
  /** Empty when there is none, or when the scanner is holding it. */
  bio: string;
  /** True when the person reading this already follows them. */
  viewerFollows: boolean;
  /** True when this row is the person reading it. */
  isViewer: boolean;
};

export type FollowListState =
  | { state: "unconfigured" }
  /** No such handle, or a block in either direction hides whoever holds it. */
  | { state: "missing"; handle: string }
  | {
      state: "found";
      handle: string;
      displayLabel: string;
      direction: FollowDirection;
      isOwner: boolean;
      signedIn: boolean;
      /** The count as the profile itself reports it. The authority. */
      total: number;
      people: FollowRow[];
      /** The created_at to ask for next, or null when the list has ended. */
      cursor: string | null;
    };

const PAGE_SIZE = 50;

/**
 * One page of a follower or following list.
 *
 * Cursor pagination on `created_at` rather than an offset, exactly as the feed
 * does, so somebody gaining a follower while another person reads the list
 * cannot shift a page under them and repeat a row. Both indexes the follows
 * table carries are `(id, created_at desc)`, so both directions are an index
 * scan rather than a sort.
 */
export async function getFollowList(
  rawHandle: string,
  direction: FollowDirection,
  before?: string,
): Promise<FollowListState> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };

  const handle = rawHandle.trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(handle)) return { state: "missing", handle };

  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };

  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;

  const { data: owner, error: ownerError } = await supabase
    .from("social_profiles")
    .select("user_id, handle, display_label, follower_count, following_count")
    .eq("handle", handle)
    .maybeSingle();

  /* A block in either direction removes the row entirely, so this one branch
     covers "no such handle" and "not reachable from your account". Telling
     those apart is the disclosure the block exists to prevent. */
  if (ownerError || !owner) return { state: "missing", handle };

  const mine = direction === "followers" ? "followee_id" : "follower_id";

  let query = supabase
    .from("follows")
    .select("follower_id, followee_id, created_at")
    .eq(mine, owner.user_id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (before) query = query.lt("created_at", before);

  const { data: edges, error } = await query;

  const total =
    direction === "followers" ? owner.follower_count : owner.following_count;

  const base = {
    state: "found" as const,
    handle: owner.handle,
    displayLabel: owner.display_label ?? "",
    direction,
    isOwner: viewerId === owner.user_id,
    signedIn: Boolean(viewerId),
    total,
  };

  if (error || !edges || edges.length === 0) {
    return { ...base, people: [], cursor: null };
  }

  const ended = edges.length <= PAGE_SIZE;
  const page = ended ? edges : edges.slice(0, PAGE_SIZE);
  const last = page[page.length - 1];

  const ids = [
    ...new Set(
      page.map((edge) => (direction === "followers" ? edge.follower_id : edge.followee_id)),
    ),
  ];

  const [people, viewerFollowing] = await Promise.all([
    readProfiles(supabase, ids, viewerId),
    readViewerFollowing(supabase, viewerId, ids),
  ]);

  /* Ordered by the follow rows, not by whatever the profile read returned, so
     newest first stays newest first. */
  const byId = new Map(people.map((person) => [person.userId, person]));
  const ordered: FollowRow[] = [];
  for (const edge of page) {
    const id = direction === "followers" ? edge.follower_id : edge.followee_id;
    const person = byId.get(id);
    if (!person) continue;
    ordered.push({
      ...person,
      viewerFollows: viewerFollowing.has(id),
      isViewer: id === viewerId,
    });
    byId.delete(id);
  }

  return {
    ...base,
    people: ordered,
    cursor: ended || !last ? null : last.created_at,
  };
}

type BareRow = Omit<FollowRow, "viewerFollows" | "isViewer">;

async function readProfiles(
  supabase: SupabaseClient<Database>,
  ids: string[],
  viewerId: string | null,
): Promise<BareRow[]> {
  if (ids.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from("social_profiles")
      .select("user_id, handle, display_label, avatar_path, is_agent, bio, bio_status")
      .in("user_id", ids);
    if (error || !data) return [];
    return data.map((row) => ({
      userId: row.user_id,
      handle: row.handle,
      displayLabel: row.display_label ?? "",
      avatarUrl: row.avatar_path ?? "",
      isAgent: row.is_agent,
      /* A bio the scanner is holding is shown to nobody but its own author,
         which is the same rule the profile page follows and it is applied here
         rather than in a template so no list can forget it. */
      bio:
        row.bio_status === "LIVE" || row.user_id === viewerId ? (row.bio ?? "") : "",
    }));
  } catch {
    return [];
  }
}

/** Which of these people the viewer already follows. One read for the page. */
async function readViewerFollowing(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  ids: string[],
): Promise<Set<string>> {
  if (!viewerId || ids.length === 0) return new Set();
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", viewerId)
      .in("followee_id", ids);
    if (error || !data) return new Set();
    return new Set(data.map((row) => row.followee_id));
  } catch {
    return new Set();
  }
}
