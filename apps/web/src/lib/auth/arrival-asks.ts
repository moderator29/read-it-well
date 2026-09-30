"use server";

import { fail, ok, type ActionResult } from "@/lib/actions/envelope";
import { resolveSession } from "@/lib/actions/session";
import { HEAR_ABOUT_VALUES } from "./signup-options";

/**
 * "HOW DID YOU HEAR ABOUT VALLO?", ASKED AFTER THE ACCOUNT EXISTS (A1).
 *
 * The sign-up form used to require it; it is now one optional tap on the
 * interests step of `/welcome`. The answer is kept where the form kept it,
 * `hear_about` in the account's own metadata (the person's to write), so
 * nothing new is stored and no schema changes. Only the listed answers are
 * accepted, in their English stored form.
 */
export async function rememberHearAbout(value: string): Promise<ActionResult<null>> {
  if (typeof value !== "string" || !HEAR_ABOUT_VALUES.includes(value)) {
    return fail("Choose one of the listed options.");
  }
  const session = await resolveSession();
  if (session.state !== "signed-in") return fail("Sign in to answer this.");

  const { error } = await session.supabase.auth.updateUser({ data: { hear_about: value } });
  if (error) return fail("That did not save. Try again in a moment.");
  return ok(null);
}
