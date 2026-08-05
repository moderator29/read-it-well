"use server";

/**
 * Where a person is, and what they do for a living.
 *
 * Two jobs in one module. The first is lazy reference reads: a sign-up form on
 * a phone should not carry 774 local governments and 749 occupations down the
 * wire before anybody has chosen a state, so the pickers ask for what they need
 * at the moment they are opened. These are reads behind a server action rather
 * than a public API route, so there is no new surface to secure and the rows
 * still arrive under the tables' own `select using (true)` policies.
 *
 * The second is the write. `profiles.state_code`, `profiles.lga_code` and
 * `profiles.occupation_code` all change together, under the caller's own
 * RLS-bound client, so the database decides whose row moves. A local government
 * in the wrong state is refused by `private.guard_profile_place` with SQLSTATE
 * RM020 and that refusal is turned into a sentence here rather than a code.
 */

import { revalidatePath } from "next/cache";
import { fail, formDataToObject, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { listLocalGovernments, listOccupations } from "./queries";
import {
  PLACE_MISMATCH_MESSAGE,
  PLACE_MISMATCH_SQLSTATE,
  type LocalGovernmentOption,
  type OccupationOption,
} from "./reference";
import { updatePlaceSchema } from "./schema";

const SAVE_FAILED_MESSAGE =
  "We could not save that just now. Your choices are still on this screen, so try again in a moment.";

const NO_ROW_MESSAGE =
  "We could not find your profile record. Sign out, sign back in, and try again.";

const UNKNOWN_PLACE_MESSAGE =
  "We do not have that state or local government on file. Choose one from the list.";

const UNKNOWN_OCCUPATION_MESSAGE =
  "We do not have that occupation on file. Choose one from the list.";

/* ------------------------------------------------------------------- reads */

export async function fetchLocalGovernments(
  stateCode: string,
): Promise<ActionResult<LocalGovernmentOption[]>> {
  const rows = await listLocalGovernments(stateCode);
  return ok(rows);
}

export async function fetchOccupations(): Promise<ActionResult<OccupationOption[]>> {
  const rows = await listOccupations();
  return ok(rows);
}

/* ------------------------------------------------------------------- write */

export type PlaceSaved = {
  stateCode: string;
  lgaCode: string;
  occupationCode: string;
};

/**
 * A Postgres error carries its SQLSTATE in `code`. Foreign key violations are
 * 23503, and the state-to-local-government contradiction is RM020, raised by
 * the BEFORE trigger on profiles. Everything else keeps the general message,
 * because guessing at an unknown failure is how people are told the wrong thing.
 */
function placeErrorMessage(error: { code?: string; message?: string } | null): string {
  if (!error) return SAVE_FAILED_MESSAGE;
  if (error.code === PLACE_MISMATCH_SQLSTATE) return PLACE_MISMATCH_MESSAGE;
  if (error.code === "23503") {
    return (error.message ?? "").includes("occupation")
      ? UNKNOWN_OCCUPATION_MESSAGE
      : UNKNOWN_PLACE_MESSAGE;
  }
  return SAVE_FAILED_MESSAGE;
}

export async function updatePlace(input: unknown): Promise<ActionResult<PlaceSaved>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(updatePlaceSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);
  const values = parsed.data;

  const { supabase, user } = session;

  const { data: saved, error } = await supabase
    .from("profiles")
    .update({
      state_code: values.stateCode === "" ? null : values.stateCode,
      lga_code: values.lgaCode === "" ? null : values.lgaCode,
      occupation_code: values.occupationCode === "" ? null : values.occupationCode,
    })
    .eq("id", user.id)
    .select("state_code, lga_code, occupation_code")
    .maybeSingle();

  if (error) {
    const message = placeErrorMessage(error);
    // RM020 is about the pairing, so it lights the local government field: that
    // is the one the person can change to make the two agree.
    if (message === PLACE_MISMATCH_MESSAGE) return fail(message, { lgaCode: message });
    return fail(message);
  }
  if (!saved) return fail(NO_ROW_MESSAGE);

  revalidatePath("/home");
  revalidatePath("/profile");
  revalidatePath("/settings");
  revalidatePath("/settings/place");

  return ok({
    stateCode: saved.state_code ?? "",
    lgaCode: saved.lga_code ?? "",
    occupationCode: saved.occupation_code ?? "",
  });
}

/** Form binding for useActionState. */
export async function updatePlaceAction(
  _prev: ActionResult<PlaceSaved> | null,
  formData: FormData,
): Promise<ActionResult<PlaceSaved>> {
  return updatePlace(formDataToObject(formData));
}
