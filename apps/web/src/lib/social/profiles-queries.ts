import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { createClient } from "../supabase/server";
import type { Database } from "../supabase/database.types";
import { SUPABASE_URL } from "../supabase/env";
import {
  coverPublicUrl,
  isOfficialHandle,
  type BioStatus,
  type ContactPolicy,
} from "./profiles-schema";
import {
  readAgentId,
  readAgentTrust,
  readOccupationAndPlace,
  readStanding,
  readStoryCount,
  type AgentTrust,
  type Occupation,
  type ProfilePlace,
  type Standing,
} from "./profile-extras";

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
    /*
     * Counted, not trusted.
     *
     * All three columns are `not null default 0` today, so the raw assignment
     * could not actually misfire, and the type saying `number` was true by the
     * schema's good manners rather than by anything in this file. That is one
     * ALTER away from being false, and the failure it produces is loud and
     * public: `formatNumber(undefined)` returns the string "NaN", so a profile
     * would read "NaN Followers" at the person whose page it is. A DOM probe
     * caught exactly that against a fixture missing the columns.
     *
     * `Number(x) || 0` also absorbs a string, which is what PostgREST sends for
     * a bigint, and NaN itself.
     */
    followerCount: Number(row.follower_count) || 0,
    followingCount: Number(row.following_count) || 0,
    postCount: Number(row.post_count) || 0,
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
  /**
   * Nothing to show here, which is two situations wearing one face.
   *
   * Either nobody holds this handle, or somebody does and a block in one
   * direction or the other makes their row invisible to this viewer, because
   * `social_profiles_select` carries `not private.blocked_with(user_id)`.
   *
   * Nothing in an exposed schema can tell those apart, and the copy is written
   * so it does not have to: it never asserts the handle is free. That is
   * deliberate. A blocked visitor being told "this name is available" would be
   * a lie, and it would send them into a claim the unique index then refuses.
   */
  | {
      state: "claimable";
      handle: string;
      canClaim: boolean;
      signedIn: boolean;
      /** A name the platform keeps for itself, such as anything with `rentme`
          in it. Never offered, and said plainly rather than silently withheld. */
      official: boolean;
    }
  | {
      state: "found";
      profile: SocialProfileView;
      isOwner: boolean;
      /** The viewer's own handle, when they have claimed one. */
      viewerHandle: string | null;
      /** True when the viewer already follows this person. */
      viewerFollows: boolean;
      /**
       * True when the viewer has already muted this person.
       *
       * Read rather than assumed, because a menu offering "Mute" to somebody
       * who muted this account a month ago is a control that appears to do
       * nothing: the insert collides on the primary key, the action reports
       * success, and the person is left wondering which of the two states they
       * are in. `mutes_select_own` makes the honest answer one small read.
       */
      viewerMutes: boolean;
      /** False for a signed-out visitor, so the button can ask them to sign in. */
      signedIn: boolean;
      homeArea: { slug: string; name: string; city: string } | null;
      moderatorOf: ModeratorOf[];
      /** Chosen from `public.occupations`. Readable only by its owner today. */
      occupation: Occupation | null;
      /** Local government, state, Nigeria. Same visibility as the occupation. */
      place: ProfilePlace | null;
      /** Admin-granted badges only. Never anything a code path awarded. */
      standing: Standing[];
      /** Null for anybody `public.agent_trust` returns no row for. */
      trust: AgentTrust | null;
      /** Counted under the viewer's own visibility by `public.story_count`. */
      storyCount: number;
      /** The `agents` row behind this person, when it can be resolved. */
      agentId: string | null;
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
      /* A name the platform keeps for itself is never offered. The database
         refuses it with RM002, so offering it here would walk somebody into a
         refusal, and `@rentme` is a name this product now writes into threads
         itself. */
      canClaim: Boolean(viewerId) && !viewerHasHandle && !isOfficialHandle(handle),
      official: isOfficialHandle(handle),
      signedIn: Boolean(viewerId),
    };
  }

  const row = data as ProfileRow;
  const isOwner = viewerId === row.user_id;

  /*
   * There is no block check here any more, and that is not an omission.
   *
   * `social_profiles_select` now carries `not private.blocked_with(user_id)`,
   * which is bidirectional, so a blocked profile in either direction never
   * reaches this line at all: the row simply is not returned. Re-asking the
   * `blocks` table would be a round trip that can only ever answer no.
   *
   * The consequence lands in the `!data` branch above, and it is stated in the
   * copy there rather than hidden.
   */
  const profile = toView(row, isOwner);

  /* Nine reads, all started together. In sequence this page would be nine
     round trips, which on the connections this product is built for is the
     whole difference between a page and a wait. */
  const [
    homeArea,
    moderatorOf,
    viewerHandle,
    viewerFollows,
    viewerMutes,
    occupationAndPlace,
    standing,
    trust,
    storyCount,
    agentId,
  ] = await Promise.all([
    readHomeArea(supabase, row.home_area_id),
    readModeratorOf(supabase, row.user_id),
    readViewerHandle(supabase, viewerId, row.handle, isOwner),
    readViewerFollows(supabase, viewerId, row.user_id, isOwner),
    readViewerMutes(supabase, viewerId, row.user_id, isOwner),
    readOccupationAndPlace(supabase, row.user_id, isOwner),
    readStanding(supabase, row.user_id),
    /* `agent_trust` returns NO ROW for somebody who is not an agent, which is
       how the band decides whether to exist. It is asked unconditionally on
       purpose: asking `is_agent` first and then asking this would be two
       answers to one question, and they can disagree. */
    readAgentTrust(supabase, row.user_id),
    readStoryCount(supabase, row.user_id),
    readAgentId(supabase, row.user_id),
  ]);

  return {
    state: "found",
    profile,
    isOwner,
    viewerHandle,
    viewerFollows,
    viewerMutes,
    signedIn: Boolean(viewerId),
    homeArea,
    moderatorOf,
    occupation: occupationAndPlace.occupation,
    place: occupationAndPlace.place,
    standing,
    trust,
    storyCount,
    agentId,
  };
}

/**
 * Has the viewer already muted this person?
 *
 * `mutes_select_own` returns only the viewer's own rows, so this can never
 * answer for anybody else, and a failure reads as "not muted", which is the
 * state whose control does something: muting an already muted account collides
 * harmlessly on the primary key.
 */
async function readViewerMutes(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  otherId: string,
  isOwner: boolean,
): Promise<boolean> {
  if (!viewerId || isOwner) return false;
  try {
    const { data, error } = await supabase
      .from("mutes")
      .select("target_id")
      .eq("user_id", viewerId)
      .eq("target_kind", "USER")
      .eq("target_id", otherId)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Does the viewer already follow this person?
 *
 * `follows_select` is public, so this is one small read and it is the truth
 * rather than a guess the button has to hold. A failure reads as "not
 * following", which is the state whose control does something useful: the worst
 * case is a Follow button on somebody you already follow, and the insert then
 * answers 23505 and settles.
 */
async function readViewerFollows(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  otherId: string,
  isOwner: boolean,
): Promise<boolean> {
  if (!viewerId || isOwner) return false;
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", viewerId)
      .eq("followee_id", otherId)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
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
