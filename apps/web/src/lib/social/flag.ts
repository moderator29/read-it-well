import "server-only";

import { isFeatureEnabled, type FeatureKey } from "../flags";

/**
 * The kill switch for Around.
 *
 * **The row existed and nothing read it.** `public.feature_flags` carries a
 * `social` row. It shipped with `enabled = false`, deliberately (a switch that
 * ships on has never been tested in the off position), and the owner turned
 * Around ON in `20260804164236_around_is_on.sql`, so it is on now. It is still
 * the one surface where strangers write things other strangers read, so the
 * row stays the kill switch: setting `enabled = false` takes every social
 * route and write down at once, with no deploy. Before this reader every social
 * route and write was fully on regardless, which would have made the switch a
 * thing somebody reaches for at 2am and finds connected to nothing: the same
 * shape as a mute that writes a row nobody reads, and worse than a missing
 * feature, because the product believes it has one.
 *
 * **One reader, and not a second one beside the platform's.** Two
 * implementations of one switch is how a kill switch ends up half thrown, so
 * this delegates to `isFeatureEnabled` rather than querying `feature_flags`
 * itself.
 *
 * The contract is the platform's own and is not restated: fail OPEN. A missing
 * table, a missing row, a network error or no Supabase config all read as
 * enabled, because flags exist to switch a feature off during an incident and
 * never to gate one on. A row that says false is the only thing that closes it.
 */
const SOCIAL_KEY: FeatureKey = "social";

export async function isSocialEnabled(): Promise<boolean> {
  return isFeatureEnabled(SOCIAL_KEY);
}

/**
 * What a person is told, in every place the switch is off.
 *
 * One sentence, no apology, no date we cannot keep, and no word that suggests
 * the feature was never built. Somebody who was reading a place five minutes
 * ago deserves to know that their words are still there.
 */
export const SOCIAL_OFF_TITLE = "Around is paused";

export const SOCIAL_OFF_BODY =
  "Places, posts and people are switched off for a moment while we sort something out. Nothing has been deleted and nothing you wrote has gone anywhere. The rest of Vallo works as normal.";

/**
 * The same fact, as one line, for an action that cannot go through.
 *
 * "…will work again SHORTLY" is gone. It is the mild end of the banned family:
 * a promise about a time nobody here can keep, and in production this branch
 * means a switch is off rather than that anything is unbuilt. The reader loses
 * nothing, because the sentence they could act on is the one about their words
 * still being there.
 */
export const SOCIAL_OFF_MESSAGE =
  "Around is paused for a moment. Nothing you wrote has gone anywhere, and it comes back on as soon as we are done.";
