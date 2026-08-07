import "server-only";

import { resolveSession } from "../actions/session";
import { parseSettings } from "../profile/schema";
import { knownInterests, type PropertyType } from "./schema";

/**
 * Server reads for stated intent.
 *
 * Three callers, three different questions, so three functions rather than one
 * that returns more than any of them needs:
 *
 *   loadInterestsState  the onboarding screen and its gate. Needs to know
 *                       whether the question has been asked at all.
 *   readStatedIntent    discovery's RANKING. Needs the list and nothing else,
 *                       and must never be the reason a search page fails to
 *                       render.
 *   readIntentTuning    discovery's per-card CONTROL. Needs the list and,
 *                       separately, whether there is anybody to save it for.
 *
 * All three read under the caller's own RLS-bound client, so the answer can
 * only ever be that person's own row.
 */

export type InterestsState =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | {
      state: "signed-in";
      interests: PropertyType[];
      /** True once the question has been answered or skipped. */
      asked: boolean;
      /** True once the three welcome cards have been dismissed. */
      welcomeSeen: boolean;
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
  if (error || !row) return { state: "signed-in", interests: [], asked: true, welcomeSeen: true };

  return {
    state: "signed-in",
    interests: knownInterests(row.interests),
    asked: parseSettings(row.settings).interestsAsked,
    welcomeSeen: parseSettings(row.settings).welcomeSeen,
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
  return (await readIntentTuning()).interests;
}

/**
 * The same row, read for the control rather than for the ranking.
 *
 * TWO FACTS, AND THEY ARE NOT THE SAME FACT. `readStatedIntent` returns an
 * empty list for a signed-out visitor, an unconfigured platform, an unreadable
 * row and somebody who simply answered nothing - because to a ranking those
 * four situations genuinely are one situation, which is "rank this the way you
 * would for anybody". To a CONTROL they are not. There is no anonymous store
 * for this and there will not be one, so a signed-out visitor must not be
 * offered a button that can only fail. `signedIn` is that difference, stated
 * once here rather than guessed at each call site.
 *
 * Nothing here throws, for the same reason nothing in `readStatedIntent` threw:
 * a personalisation that can break a search page is worse than no
 * personalisation at all. A read that falls over returns `signedIn: false`,
 * which hides the control rather than showing one whose state we do not know.
 */
export type IntentTuning = {
  /** True only when there is an account this can actually be saved to. */
  signedIn: boolean;
  /** The stored answer. Empty is a real answer, and not the same as no account. */
  interests: PropertyType[];
};

export async function readIntentTuning(): Promise<IntentTuning> {
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return { signedIn: false, interests: [] };
    const { data, error } = await session.supabase
      .from("profiles")
      .select("interests")
      .eq("id", session.user.id)
      .maybeSingle();
    /*
     * Signed in, but the row would not come back. The control still belongs on
     * the screen: the person has an account, the action will read the row again
     * for itself, and hiding the control here would punish them for one failed
     * read. What we cannot claim is what they already said, so the list is
     * empty and the sheet opens reading "not ranked ahead" until a write proves
     * otherwise.
     */
    if (error || !data) return { signedIn: true, interests: [] };
    return { signedIn: true, interests: knownInterests(data.interests) };
  } catch {
    return { signedIn: false, interests: [] };
  }
}
