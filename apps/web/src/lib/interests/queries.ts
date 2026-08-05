import "server-only";

import { resolveSession } from "../actions/session";
import { parseSettings } from "../profile/schema";
import { knownInterests, type PropertyType } from "./schema";

/**
 * Server reads for stated intent.
 *
 * Two callers, two different questions, so two functions rather than one that
 * returns more than either needs:
 *
 *   loadInterestsState  the onboarding screen and its gate. Needs to know
 *                       whether the question has been asked at all.
 *   readStatedIntent    discovery. Needs the list and nothing else, and must
 *                       never be the reason a search page fails to render.
 *
 * Both read under the caller's own RLS-bound client, so the answer can only
 * ever be that person's own row.
 */

export type InterestsState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | {
      state: "signed-in";
      interests: PropertyType[];
      /** True once the question has been answered or skipped. */
      asked: boolean;
    };

export async function loadInterestsState(): Promise<InterestsState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { data: row, error } = await session.supabase
    .from("profiles")
    .select("interests, settings")
    .eq("id", session.user.id)
    .maybeSingle();

  /*
   * A profile row that cannot be read is not a reason to put a first-run
   * question in front of somebody. `asked: true` is the conservative answer:
   * it says nothing about their intent and it does not interrupt them.
   */
  if (error || !row) return { state: "signed-in", interests: [], asked: true };

  return {
    state: "signed-in",
    interests: knownInterests(row.interests),
    asked: parseSettings(row.settings).interestsAsked,
  };
}

/**
 * The caller's stated intent, for discovery.
 *
 * Empty for a signed-out visitor, an unconfigured platform, an unreadable row
 * or somebody who never answered - four situations that all mean the same
 * thing to a search page, which is "rank this the way you would for anybody".
 * Nothing here throws, because a personalisation that can break a search page
 * is worse than no personalisation at all.
 */
export async function readStatedIntent(): Promise<PropertyType[]> {
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return [];
    const { data, error } = await session.supabase
      .from("profiles")
      .select("interests")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error || !data) return [];
    return knownInterests(data.interests);
  } catch {
    return [];
  }
}
