"use server";

/**
 * Saving what somebody came here for.
 *
 * The same envelope as every other mutation on the platform: `validate` against
 * a Zod schema, a refusal in plain English or `ok` with what the database
 * actually stored. Nothing here reports a raw error code to a person.
 *
 * Two writes, deliberately separate:
 *
 *   saveInterests  the answer, into `profiles.interests`. Validated against
 *                  `public.property_type` before it leaves this process and
 *                  again by the column's own type when it arrives, so an
 *                  unknown value cannot be stored by any route.
 *   skipInterests  the refusal to answer, into `profiles.settings`. It stores
 *                  no intent at all - it records only that we have asked - and
 *                  that is what makes the skip real: the gate on `/home` reads
 *                  it and never asks again.
 *
 * Both go through the caller's own RLS-bound client, so `profiles_update_own`
 * decides whose row moves. The column is granted to `authenticated` and the
 * policy admits exactly one row: the caller's.
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
import { knownInterests, saveInterestsSchema, type PropertyType } from "./schema";

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
