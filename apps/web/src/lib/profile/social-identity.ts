import "server-only";

import { resolveSession } from "../actions/session";
import { SUPABASE_URL } from "../supabase/env";
import { coverPublicUrl } from "../social/profiles-schema";

/**
 * The signed-in person's own social identity, for the account profile.
 *
 * `/profile` and `/u/[handle]` were two different ideas of the same person. One
 * had a cover, a handle, followers and posts; the other had an avatar in a
 * white card and three counters. They were not two designs of one screen, they
 * were two people, and only one of them looked like it belonged to this
 * platform.
 *
 * This is the small read that lets the account page wear the social identity:
 * the handle, the cover, the counts. It is deliberately not `loadPublicProfile`
 * for the caller's own handle, because that reader answers the much larger
 * question of what a visitor may see, resolves standing, moderation, trust,
 * blocks and the home area, and none of that is needed to draw a header for
 * somebody looking at their own page.
 *
 * Everything goes through the caller's own RLS-bound client. `social_profiles`
 * is readable to the row's owner by policy, so a person always sees their own
 * identity here even when nobody else can.
 *
 * Returning null means one specific thing: this person has not claimed a
 * handle. That is not an error and not an empty state, it is an offer, and the
 * screen above shows it as one.
 */

export type AccountSocialIdentity = {
  handle: string;
  /** The cover's public URL, or empty when nobody has set one. */
  coverUrl: string;
  /** The stored path, which the cover picker needs in order to replace it. */
  coverPath: string | null;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  /** True for an APPROVED agent. A role marker, never an earned badge. */
  isAgent: boolean;
};

export type AccountSocialState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  /** Signed in, no handle claimed. The screen offers one. */
  | { state: "unclaimed"; userId: string }
  | { state: "claimed"; userId: string; identity: AccountSocialIdentity };

export async function loadAccountSocialIdentity(): Promise<AccountSocialState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { supabase, user } = session;

  const { data, error } = await supabase
    .from("social_profiles")
    .select("handle, bio, cover_path, follower_count, following_count, post_count, is_agent")
    .eq("user_id", user.id)
    .maybeSingle();

  // A read error and a missing row are the same outcome for this screen: there
  // is no identity to draw, so it offers one rather than showing a broken
  // header. The account block underneath is unaffected either way.
  if (error || !data) return { state: "unclaimed", userId: user.id };

  return {
    state: "claimed",
    userId: user.id,
    identity: {
      handle: data.handle,
      coverUrl: data.cover_path ? coverPublicUrl(SUPABASE_URL, data.cover_path) : "",
      coverPath: data.cover_path,
      bio: data.bio ?? "",
      followerCount: data.follower_count ?? 0,
      followingCount: data.following_count ?? 0,
      postCount: data.post_count ?? 0,
      isAgent: data.is_agent ?? false,
    },
  };
}
