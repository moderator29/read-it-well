import "server-only";

/**
 * The parts of a person's page that come from outside `social_profiles`.
 *
 * Occupation, local government, admin-granted standing and an agent's trust
 * figures. All four are live on the database now: `public.occupations` (749
 * rows), `public.local_governments` (774), `profiles.occupation_code`,
 * `profiles.lga_code`, the `top_contributor` badge and
 * `public.agent_trust(user_id)`.
 *
 * **One of them can only be read for the person reading it, and that is not a
 * bug in this file.** `occupation_code` and `lga_code` are columns on
 * `public.profiles`, whose only select policies are `profiles_select_own` and
 * `profiles_select_admin`. So a visitor cannot read a stranger's occupation or
 * local government at all, and this returns null for them rather than
 * pretending. Verified on the live database: `social_profiles` carries no
 * `occupation_code`, `lga_code` or `agent_id` column, so there is nothing
 * public to read instead.
 *
 * The fix is one line in `private.project_social_identity`, projecting those
 * three onto `social_profiles` exactly as `display_label`, `avatar_path` and
 * `is_agent` already are. It is written up in the handover rather than worked
 * around here, because a second read path for the same fact is how two of them
 * end up disagreeing.
 *
 * Every read is separate and failure tolerant. A `select` naming a column that
 * is not there fails the whole statement with 42703, so folding these into
 * `loadPublicProfile`'s own query would take the profile page down rather than
 * losing one chip.
 *
 * Null means the chip is absent. It never means a placeholder chip, a dash, or
 * "Occupation not set". A person who has not chosen one has nothing to say
 * there, and inventing a row for them is how a profile ends up looking like a
 * form somebody abandoned.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

export type Occupation = { code: string; name: string };

/** An admin-granted badge, worn as a chip beside the occupation. */
export type Standing = {
  code: string;
  name: string;
  /** The commissioned 3D object this badge is drawn with. */
  objectName: string;
};

export type ProfilePlace = {
  lga: string | null;
  state: string | null;
  /** What the meta row prints. Never a fragment. */
  label: string;
};

export type AgentTrust = {
  /** 0 to 100, computed from real bookings and real message timings. */
  score: number;
  completedDeals: number;
  /** Already fit to print: "2 hrs", "40 mins", "Not yet". */
  responseTime: string;
  reviewCount: number;
  averageRating: number | null;
};

/* The generated types are regenerated after a migration, not before it, so the
   two disagree for exactly as long as it takes the lead to run the generator.
   Loosened at the call, never across the whole client. */
type Loose = SupabaseClient<Database>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loose = (supabase: Loose) => supabase as any;

/**
 * The occupation somebody chose, and where they say they are.
 *
 * Readable for the person themselves and for an admin, and for nobody else,
 * because `profiles` is `select own`. `isSelf` is passed rather than worked out
 * here so the caller's own answer about ownership is the only one in play.
 */
export async function readOccupationAndPlace(
  supabase: Loose,
  userId: string,
  isSelf: boolean,
): Promise<{ occupation: Occupation | null; place: ProfilePlace | null }> {
  if (!isSelf) return { occupation: null, place: null };

  let occupationCode: string | null = null;
  let lgaCode: string | null = null;

  try {
    const { data, error } = await loose(supabase)
      .from("profiles")
      .select("occupation_code, lga_code")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) {
      occupationCode = data.occupation_code ?? null;
      lgaCode = data.lga_code ?? null;
    }
  } catch {
    /* Nothing to show, and nothing broken. */
  }

  const [occupation, place] = await Promise.all([
    readOccupation(supabase, occupationCode),
    readPlace(supabase, lgaCode),
  ]);

  return { occupation, place };
}

async function readOccupation(
  supabase: Loose,
  code: string | null,
): Promise<Occupation | null> {
  if (!code) return null;
  try {
    const { data, error } = await loose(supabase)
      .from("occupations")
      .select("code, name")
      .eq("code", code)
      .maybeSingle();
    if (error || !data) return null;
    return { code: data.code, name: data.name };
  } catch {
    return null;
  }
}

/**
 * Local government, then state, then Nigeria.
 *
 * Assembled here rather than in a template, so one place decides what to print
 * when only half of it is known. `local_governments` is public read and its
 * codes look like `la_ikeja`, so the state comes back with the row rather than
 * needing a second lookup.
 */
async function readPlace(
  supabase: Loose,
  lgaCode: string | null,
): Promise<ProfilePlace | null> {
  if (!lgaCode) return null;
  try {
    const { data, error } = await loose(supabase)
      .from("local_governments")
      .select("name, state_code, states ( name )")
      .eq("code", lgaCode)
      .maybeSingle();
    if (error || !data) return null;

    const lga: string | null = data.name ?? null;
    const state: string | null = data.states?.name ?? null;
    if (!lga && !state) return null;

    return { lga, state, label: [lga, state, "Nigeria"].filter(Boolean).join(", ") };
  } catch {
    return null;
  }
}

/**
 * Standing an admin granted by hand.
 *
 * Only `manual_only` badges appear as a chip. An earned badge is a different
 * thing and belongs in the badges surface: the chip beside somebody's name is
 * the platform vouching for them deliberately, and mixing the two would make
 * "Top Contributor" mean the same as "posted ten times".
 *
 * The database refuses a manual grant with no `granted_by` outright, with
 * RM021, so a chip here is always somebody's decision and never a side effect
 * of a code path. Nothing in this layer ever writes one.
 *
 * `user_badges_select` already hides a revoked grant from everybody but its
 * holder and an admin, and this asks for `revoked_at is null` on top, so a
 * revoked chip cannot survive on somebody else's screen through a stale read.
 */
export async function readStanding(
  supabase: Loose,
  userId: string,
): Promise<Standing[]> {
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select("badge_code, badges ( code, name, object_name, manual_only )")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .limit(4);
    if (error || !data) return [];
    return data
      .map((row) => row.badges)
      .filter(
        (badge): badge is {
          code: string;
          name: string;
          object_name: string;
          manual_only: boolean;
        } => Boolean(badge) && Boolean(badge?.manual_only),
      )
      .map((badge) => ({
        code: badge.code,
        name: badge.name,
        objectName: badge.object_name,
      }));
  } catch {
    return [];
  }
}

/**
 * An agent's numbers.
 *
 * `public.agent_trust(user_id)` returns **no row at all** for somebody who is
 * not an agent, which is how this decides whether the band is rendered rather
 * than asking a second question and hoping the two agree. A trust score of zero
 * and no trust score are very different claims, and an empty result is the
 * database saying the second one.
 *
 * `response_minutes` is a median in minutes, and the band prints a duration, so
 * the conversion happens here: one place decides that 95 minutes reads as
 * "1.6 hrs" and not as "95". Nobody has replied to anything yet reads as
 * "Not yet", which is honest and is not zero.
 */
export async function readAgentTrust(
  supabase: Loose,
  userId: string,
): Promise<AgentTrust | null> {
  try {
    const { data, error } = await loose(supabase).rpc("agent_trust", { p_user: userId });
    if (error || !data) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    const score = Number(row.trust_score);
    const deals = Number(row.completed_deals);
    if (!Number.isFinite(score) || !Number.isFinite(deals)) return null;

    const minutes = Number(row.response_minutes);
    const rating = Number(row.average_rating);

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      completedDeals: Math.max(0, Math.round(deals)),
      responseTime: durationLabel(Number.isFinite(minutes) ? minutes : null),
      reviewCount: Math.max(0, Math.round(Number(row.review_count) || 0)),
      averageRating: Number.isFinite(rating) && rating > 0 ? Math.round(rating * 10) / 10 : null,
    };
  } catch {
    return null;
  }
}

/** Minutes as something a person reads at a glance. */
function durationLabel(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return "Not yet";
  if (minutes < 60) return `${Math.round(minutes)} mins`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)} hrs`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/**
 * How many stories somebody has, for the count beside the tab.
 *
 * `public.story_count` is security INVOKER on purpose, so it counts under the
 * caller's own visibility: a story the scanner is holding is counted for its
 * author and not for a stranger, which is exactly what `posts_select` already
 * decided. That is why this is one call and not a count this file could do
 * itself.
 */
export async function readStoryCount(supabase: Loose, userId: string): Promise<number> {
  try {
    const { data, error } = await loose(supabase).rpc("story_count", { p_author: userId });
    if (error) return 0;
    const value = Number(data);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * The `agents` row behind a social profile, when it can be resolved.
 *
 * `agents` is `select own` plus admin, so a visitor cannot walk from a person
 * to the listings they hold. Verified on the live database: `social_profiles`
 * carries no `agent_id`. Until it does, this answers null and the profile falls
 * back to the ordinary tab set rather than showing a Properties tab that could
 * only ever be empty. An empty tab is a worse lie than an absent one, and this
 * bar was deleted once before for exactly that reason.
 */
export async function readAgentId(
  supabase: Loose,
  userId: string,
): Promise<string | null> {
  try {
    const { data, error } = await loose(supabase)
      .from("agents")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.id ?? null;
  } catch {
    return null;
  }
}
