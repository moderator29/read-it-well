"use server";

/**
 * Saving what somebody came here for.
 *
 * The same envelope as every other mutation on the platform: `validate` against
 * a Zod schema, a refusal in plain English or `ok` with what the database
 * actually stored. Nothing here reports a raw error code to a person.
 *
 * Three writes, deliberately separate:
 *
 *   saveInterests   the answer, into `profiles.interests`. Validated against
 *                   `public.property_type` before it leaves this process and
 *                   again by the column's own type when it arrives, so an
 *                   unknown value cannot be stored by any route.
 *   skipInterests   the refusal to answer, into `profiles.settings`. It stores
 *                   no intent at all - it records only that we have asked - and
 *                   that is what makes the skip real: the gate on `/home` reads
 *                   it and never asks again.
 *   adjustInterest  the same answer, moved by one market, from a card in the
 *                   middle of results. ONE stored signal, not two: it reads the
 *                   list, adds or removes a single value, and writes it back.
 *
 * All three go through the caller's own RLS-bound client, so
 * `profiles_update_own` decides whose row moves. The column is granted to
 * `authenticated` and the policy admits exactly one row: the caller's. Nothing
 * here ever reaches for the service role, because nothing here has any business
 * touching a row that is not the caller's own.
 *
 * There is no location picker anywhere near this. `/settings/place` owns where
 * somebody is, together with the local government it has to agree with, and
 * `lib/profile/actions.ts` carries the note about what the last duplicate of
 * that question cost. One question, one screen that owns it.
 */

import { revalidatePath } from "next/cache";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { mergeSettings, parseSettings } from "../profile/schema";
import {
  adjustInterestSchema,
  knownInterests,
  saveInterestsSchema,
  type IntentDirection,
  type PropertyType,
} from "./schema";

const SAVE_FAILED_MESSAGE =
  "We could not save that just now. Your choices are still on this screen, so try again in a moment.";

const NO_ROW_MESSAGE =
  "We could not find your profile record. Sign out, sign back in, and try again.";

const SKIP_FAILED_MESSAGE =
  "We could not skip that just now. Check your connection and try again, or choose what you are here for.";

export type InterestsSaved = {
  interests: PropertyType[];
};

/**
 * Store the answer, and record that the question has been asked.
 *
 * One round trip writes both: `interests` is the answer and
 * `settings.interestsAsked` is the note that we asked, and a save that set the
 * first without the second would put the screen back in front of anybody who
 * later cleared their choices. The settings document is merged against a fresh
 * read rather than overwritten, exactly as `updateSettings` does, so a
 * notification toggle flipped on another device a second earlier survives this.
 */
export async function saveInterests(input: unknown): Promise<ActionResult<InterestsSaved>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(saveInterestsSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { supabase, user } = session;

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) return fail(SAVE_FAILED_MESSAGE);
  if (!current) return fail(NO_ROW_MESSAGE);

  const { data: saved, error } = await supabase
    .from("profiles")
    .update({
      interests: parsed.data.interests,
      settings: mergeSettings(current.settings, { interestsAsked: true }),
    })
    .eq("id", user.id)
    .select("interests")
    .maybeSingle();

  if (error) return fail(SAVE_FAILED_MESSAGE);
  if (!saved) return fail(NO_ROW_MESSAGE);

  // Discovery and the home screen both read this, and both are rendered per
  // request, so the next navigation is the one that shows the difference.
  revalidatePath("/home");
  revalidatePath("/search");
  revalidatePath("/settings");

  return ok({ interests: knownInterests(saved.interests) });
}

/**
 * Form binding for useActionState.
 *
 * `formDataToObject` is not used here on purpose. It folds repeated keys
 * last-wins, which is exactly wrong for a set of checkboxes that all post under
 * one name: nine choices would arrive as one. `getAll` is the honest read.
 */
export async function saveInterestsAction(
  _prev: ActionResult<InterestsSaved> | null,
  formData: FormData,
): Promise<ActionResult<InterestsSaved>> {
  const interests = formData
    .getAll("interests")
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return saveInterests({ interests });
}

/**
 * Decline the question, once and for all.
 *
 * Writes nothing to `interests`: somebody who skipped has stated no intent, and
 * pretending otherwise by storing a "sensible default" would be the platform
 * putting words in their mouth. The only thing recorded is that we asked.
 */
export async function skipInterests(): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { supabase, user } = session;

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) return fail(SKIP_FAILED_MESSAGE);
  if (!current) return fail(NO_ROW_MESSAGE);

  // Already asked is already skipped. Nothing to write, nothing to fail.
  if (parseSettings(current.settings).interestsAsked) return ok(null);

  const { data: saved, error } = await supabase
    .from("profiles")
    .update({ settings: mergeSettings(current.settings, { interestsAsked: true }) })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return fail(SKIP_FAILED_MESSAGE);
  if (!saved) return fail(NO_ROW_MESSAGE);

  revalidatePath("/home");
  return ok(null);
}

/** Form binding for useActionState. A skip carries no fields. */
export async function skipInterestsAction(
  _prev: ActionResult<null> | null,
  _formData: FormData,
): Promise<ActionResult<null>> {
  return skipInterests();
}

/**
 * One market, nudged from a card, in the middle of looking at results.
 *
 * WHY THIS EXISTS AT ALL, given `/settings/interests` already does it.
 *
 * The settings screen is a backstop, and a backstop is a screen almost nobody
 * opens. The signal every product of this shape actually runs on is the one
 * collected in the moment: the card is in front of the person, they have an
 * opinion about it right then, and the cost of saying so is one tap. An
 * explicit preferences screen collects the opinion of the small minority who go
 * looking for it.
 *
 * WHAT IT WRITES: `profiles.interests`, the same `property_type[]` the welcome
 * screen writes and `lib/listings/intent.ts` reads. There is deliberately no
 * second table and no second vocabulary. A parallel "signals" table would need
 * a rule for how it combines with the stated answer, that rule would live
 * nowhere, and the two would disagree about what somebody wants inside a week.
 *
 * IDEMPOTENT, IN BOTH DIRECTIONS. `more` on a market already stored, and `less`
 * on one that was never stored, are both no-ops - and they say so. The result
 * carries `changed`, which is what lets the screen tell somebody the truth
 * instead of flashing "Saved" over a write that never happened. A no-op does
 * not touch the database and does not revalidate anything, because nothing
 * downstream of it is now stale.
 *
 * READ THEN WRITE, and the read matters. A card knows one market; it knows
 * nothing about the other eight. Sending the whole list from the client would
 * mean a card that was rendered before another tab changed the answer would
 * quietly restore the old one. So the current list is read here, one element is
 * added or removed, and the result is written back.
 *
 * That leaves a genuine last-write-wins race between two tabs adjusting two
 * different markets in the same instant, and it is the honest limit of a plain
 * array column: closing it needs `array_append`/`array_remove` inside a
 * function, which is a migration, not a component. The window is one round
 * trip on one person's own row, the loss is one preference rather than money or
 * a booking, and the ONE LAW says do not ship the half of a migration nobody
 * asked for. Recorded here so the next person weighing it has the reasoning.
 *
 * `interestsAsked` is set alongside, because acting on a card IS answering the
 * question. Somebody who tuned their results from a card must not then be
 * stopped at the door by `/welcome` asking what they came here for.
 */
export type InterestAdjusted = {
  /** The whole stored answer after the write, so a caller can reconcile. */
  interests: PropertyType[];
  type: PropertyType;
  direction: IntentDirection;
  /** False when the stored answer already said this and nothing was written. */
  changed: boolean;
};

const ADJUST_FAILED_MESSAGE =
  "We could not save that just now. Nothing changed. Try again in a moment.";

export async function adjustInterest(input: unknown): Promise<ActionResult<InterestAdjusted>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(adjustInterestSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { supabase, user } = session;
  const { type, direction } = parsed.data;

  const { data: current, error: readError } = await supabase
    .from("profiles")
    .select("interests, settings")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) return fail(ADJUST_FAILED_MESSAGE);
  if (!current) return fail(NO_ROW_MESSAGE);

  const stored = knownInterests(current.interests);
  const held = stored.includes(type);
  const wants = direction === "more";

  // Already true. No write, no revalidation, and `changed: false` so the screen
  // says what actually happened rather than claiming a save.
  if (held === wants) {
    return ok({ interests: stored, type, direction, changed: false });
  }

  const next = wants ? [...stored, type] : stored.filter((value) => value !== type);

  const { data: saved, error } = await supabase
    .from("profiles")
    .update({
      interests: next,
      settings: mergeSettings(current.settings, { interestsAsked: true }),
    })
    .eq("id", user.id)
    .select("interests")
    .maybeSingle();

  if (error) return fail(ADJUST_FAILED_MESSAGE);
  if (!saved) return fail(NO_ROW_MESSAGE);

  // The same three surfaces `saveInterests` refreshes, for the same reason:
  // each is rendered per request and each reads this row.
  revalidatePath("/home");
  revalidatePath("/search");
  revalidatePath("/settings");

  return ok({ interests: knownInterests(saved.interests), type, direction, changed: true });
}
