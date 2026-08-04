import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { createClient } from "../supabase/server";
import type { Database } from "../supabase/database.types";
import { SUPABASE_URL } from "../supabase/env";
import { coverPublicUrl, type BioStatus, type ContactPolicy } from "./profiles-schema";

/**
 * Server reads for the social profile surfaces.
 *
 * Two rules run through everything here.
 *
 * A handle is the address of a person, so the reads are keyed on it rather than
 * on a user id, and it is lowercased on the way in because that is how the
 * database stores it.
 *
 * A held bio is never handed to anyone but its owner. The scanner holds a bio
 * carrying a ten digit run or payment language before it is ever visible, so
 * this module returns `bio: ""` to every other reader rather than returning the
 * text and trusting a component to hide it. A rule enforced in the query cannot
 * be forgotten in a template.
 */

export type SocialProfileView = {
  userId: string;
  handle: string;
  /**
   * The public name, projected from `public.profiles` by a definer trigger and
   * never accepted from a client. Empty when a person has set no name at all,
   * in which case the handle is the name and the surface must not render a
   * blank row.
   */
  displayLabel: string;
  /** The avatar, from the same projection. A public URL, or empty. */
  avatarUrl: string;
  /** True for an APPROVED agent. A role marker, never an earned badge. */
  isAgent: boolean;
  bio: string;
  bioStatus: BioStatus;
  pronouns: string;
  link: string;
  contactPolicy: ContactPolicy;
  pidginOk: boolean;
  homeAreaId: string | null;
  coverPath: string | null;
  /** The cover's public URL, or empty when nobody has set one. */
  coverUrl: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  claimedAt: string;
};

/** An open place, for the home area picker. */
export type AreaOption = { id: string; name: string; city: string; stateCode: string };

/* Selected once so the row shape and the mapper can never drift apart. */
const PROFILE_COLUMNS =
  "user_id, handle, display_label, avatar_path, is_agent, bio, bio_status, pronouns, link, contact_policy, pidgin_ok, home_area_id, cover_path, follower_count, following_count, post_count, handle_claimed_at";

type ProfileRow = {
  user_id: string;
  handle: string;
  display_label: string | null;
  avatar_path: string | null;
  is_agent: boolean;
  bio: string | null;
  bio_status: string;
  pronouns: string | null;
  link: string | null;
  contact_policy: string;
  pidgin_ok: boolean;
  home_area_id: string | null;
  cover_path: string | null;
  follower_count: number;
  following_count: number;
  post_count: number;
  handle_claimed_at: string;
};

/**
 * Turn a row into a view. `viewerIsOwner` decides whether a held bio travels
 * any further than this function.
 */
function toView(row: ProfileRow, viewerIsOwner: boolean): SocialProfileView {
  const bioStatus = (row.bio_status as BioStatus) ?? "LIVE";
  const bioVisible = viewerIsOwner || bioStatus === "LIVE";
  return {
    userId: row.user_id,
    handle: row.handle,
    displayLabel: row.display_label ?? "",
    avatarUrl: row.avatar_path ?? "",
    isAgent: row.is_agent,
    bio: bioVisible ? (row.bio ?? "") : "",
    bioStatus,
    pronouns: row.pronouns ?? "",
    link: row.link ?? "",
    contactPolicy: row.contact_policy === "OPEN" ? "OPEN" : "REQUEST",
    pidginOk: row.pidgin_ok,
    homeAreaId: row.home_area_id,
    coverPath: row.cover_path,
    coverUrl: row.cover_path ? coverPublicUrl(SUPABASE_URL, row.cover_path) : "",
    followerCount: row.follower_count,
    followingCount: row.following_count,
    postCount: row.post_count,
    claimedAt: row.handle_claimed_at,
  };
}

/** A handle as the database holds it: lowercase, trimmed. */
export function normaliseHandle(raw: string): string {
  return decodeURIComponent(raw).trim().replace(/^@/, "").toLowerCase();
}

/* ------------------------------------------------------- the public page */

/** A place this person looks after, for the moderator chip. */
export type ModeratorOf = { slug: string; name: string };

export type PublicProfileState =
  | { state: "unconfigured"; handle: string }
  /** The handle is not one a person could ever hold. */
  | { state: "malformed"; handle: string }
  /** Nobody holds this handle. Offered to the viewer when they have none. */
  | { state: "claimable"; handle: string; canClaim: boolean; signedIn: boolean }
  | {
      state: "found";
      profile: SocialProfileView;
      isOwner: boolean;
      /** The viewer's own handle, when they have claimed one. */
      viewerHandle: string | null;
      homeArea: { slug: string; name: string; city: string } | null;
      moderatorOf: ModeratorOf[];
    };

/**
 * Everything `/u/[handle]` renders.
 *
 * A held bio never leaves this function for anyone but its owner, which is why
 * `toView` is given the ownership answer rather than the page working it out
 * afterwards. Everything else on a social profile is public by definition: the
 * handle, the counts, the place somebody says is home and the places they look
 * after.
 */
export async function loadPublicProfile(rawHandle: string): Promise<PublicProfileState> {
  const handle = normaliseHandle(rawHandle);

  if (!/^[a-z][a-z0-9_]{2,19}$/.test(handle)) {
    return { state: "malformed", handle };
  }

  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured", handle };

  /* A profile is public, so a signed-out visitor reads it too. The anonymous
     client is the same row level security bound client with no session on it,
     which is exactly what `social_profiles_select` expects. */
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;

  const { data, error } = await supabase
    .from("social_profiles")
    .select(PROFILE_COLUMNS)
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    /* A read failure is not a missing person. Saying the handle is free when we
       simply could not look would invite somebody to claim a name that is
       already taken, so this answers as malformed rather than as claimable. */
    return { state: "malformed", handle };
  }

  if (!data) {
    let viewerHasHandle = false;
    if (viewerId) {
      const { data: mine } = await supabase
        .from("social_profiles")
        .select("handle")
        .eq("user_id", viewerId)
        .maybeSingle();
      viewerHasHandle = Boolean(mine);
    }
    return {
      state: "claimable",
      handle,
      canClaim: Boolean(viewerId) && !viewerHasHandle,
      signedIn: Boolean(viewerId),
    };
  }

  const row = data as ProfileRow;
  const isOwner = viewerId === row.user_id;
  const profile = toView(row, isOwner);

  const [homeArea, moderatorOf, viewerHandle] = await Promise.all([
    readHomeArea(supabase, row.home_area_id),
    readModeratorOf(supabase, row.user_id),
    readViewerHandle(supabase, viewerId, row.handle, isOwner),
  ]);

  return { state: "found", profile, isOwner, viewerHandle, homeArea, moderatorOf };
}

/** The place somebody says is home, when it is one anyone may see. */
async function readHomeArea(
  supabase: SupabaseClient<Database>,
  areaId: string | null,
): Promise<{ slug: string; name: string; city: string } | null> {
  if (!areaId) return null;
  try {
    const { data } = await supabase
      .from("areas")
      .select("slug, name, city")
      .eq("id", areaId)
      .maybeSingle();
    return data ? { slug: data.slug, name: data.name, city: data.city } : null;
  } catch {
    return null;
  }
}

/**
 * The places this person looks after.
 *
 * A moderator chip is a role marker, not an earned badge, and it belongs to the
 * place rather than to the person, so each one names its area. Only areas the
 * viewer may see come back, which the select policy already guarantees.
 */
async function readModeratorOf(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ModeratorOf[]> {
  try {
    const { data } = await supabase
      .from("area_members")
      .select("areas ( slug, name )")
      .eq("user_id", userId)
      .eq("role", "MODERATOR")
      .limit(6);
    if (!data) return [];
    return data
      .map((row) => row.areas)
      .filter((area): area is { slug: string; name: string } => Boolean(area))
      .map((area) => ({ slug: area.slug, name: area.name }));
  } catch {
    return [];
  }
}

/** The viewer's own handle, so the page can offer their profile rather than a
    generic sign-in. Skipped entirely when the viewer is the owner. */
async function readViewerHandle(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  ownerHandle: string,
  isOwner: boolean,
): Promise<string | null> {
  if (!viewerId) return null;
  if (isOwner) return ownerHandle;
  try {
    const { data } = await supabase
      .from("social_profiles")
      .select("handle")
      .eq("user_id", viewerId)
      .maybeSingle();
    return data?.handle ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- the editor */

export type ProfileEditorState =
  | { state: "unconfigured"; handle: string }
  | { state: "signed-out"; handle: string }
  /** Signed in, this handle is yours, here it is to edit. */
  | { state: "editing"; profile: SocialProfileView; areas: AreaOption[] }
  /** Signed in, no profile yet, and this handle is free to take. */
  | { state: "claiming"; handle: string; areas: AreaOption[] }
  /** Signed in with a handle of your own, and this is not it. */
  | { state: "not-yours"; handle: string; ownHandle: string }
  /** Signed in, no profile yet, and somebody already holds this handle. */
  | { state: "taken"; handle: string };

/**
 * Everything `/u/[handle]/edit` renders, in one resolution.
 *
 * The page is deliberately reachable for a handle nobody holds: that is how a
 * first claim happens. `/u/tolu` says the name is free and offers it, and this
 * route is where it is taken.
 */
export async function loadProfileEditor(rawHandle: string): Promise<ProfileEditorState> {
  const handle = normaliseHandle(rawHandle);

  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured", handle };
  if (session.state === "signed-out") return { state: "signed-out", handle };

  const { supabase, user } = session;

  const [{ data: mine }, { data: target }] = await Promise.all([
    supabase.from("social_profiles").select(PROFILE_COLUMNS).eq("user_id", user.id).maybeSingle(),
    supabase.from("social_profiles").select("user_id").eq("handle", handle).maybeSingle(),
  ]);

  if (mine) {
    const row = mine as ProfileRow;
    if (row.handle !== handle) {
      return { state: "not-yours", handle, ownHandle: row.handle };
    }
    return { state: "editing", profile: toView(row, true), areas: await readAreaOptions(supabase) };
  }

  if (target) return { state: "taken", handle };

  return { state: "claiming", handle, areas: await readAreaOptions(supabase) };
}

/**
 * The open places, for the home area picker.
 *
 * Only ACTIVE areas are publicly visible, and the select policy enforces that,
 * so this filter is here to keep the list short rather than to keep it safe. A
 * failure reads as an empty list: a picker with no options renders an honest
 * line about no places being open yet, which is far better than a blank page.
 */
async function readAreaOptions(
  supabase: SupabaseClient<Database>,
): Promise<AreaOption[]> {
  try {
    const { data, error } = await supabase
      .from("areas")
      .select("id, name, city, state_code")
      .eq("status", "ACTIVE")
      .order("name", { ascending: true })
      .limit(200);
    if (error || !data) return [];
    return data.map((a) => ({
      id: a.id,
      name: a.name,
      city: a.city,
      stateCode: a.state_code,
    }));
  } catch {
    return [];
  }
}
