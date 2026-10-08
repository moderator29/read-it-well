"use server";

import { revalidatePath } from "next/cache";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { normalisePhone } from "../money/funds";
import { fail, ok, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";

/**
 * SAVE A MOBILE NUMBER TO THE PROFILE, UNCONFIRMED (8 October 2026).
 *
 * While no code can be sent (`phone_confirmation` off, no SMS sender), the
 * number still has to be on file for what is opened in the member's own name:
 * the Payluk wallet reads `profiles.phone` (lib/money/member-wallet.ts
 * profileFor). This writes only the member's own row, through their own
 * session, so RLS (`profiles_update_own`) and the phone denylist trigger
 * decide exactly as they would for any profile edit. It never writes
 * `confirmed_phones`: a saved number is not a confirmed one.
 */
export async function saveProfilePhone(raw: string): Promise<ActionResult<{ last: string }>> {
  const copy = getDictionary(await getLocale()).trustVisible.phone;
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state !== "signed-in") return fail(SIGNED_OUT_MESSAGE);

  const phone = normalisePhone(typeof raw === "string" ? raw : "");
  if (!phone) return fail(copy.profileInvalid, { phone: copy.profileInvalid });

  const { error } = await session.supabase.from("profiles").update({ phone }).eq("id", session.user.id);
  if (error) {
    /* The denylist trigger raises check_violation / a raise exception: a refusal, not a fault. */
    const code = (error as { code?: string }).code;
    if (code === "23514" || code === "P0001") return fail(copy.profileRefused, { phone: copy.profileRefused });
    return fail(copy.profileFailed);
  }
  revalidatePath("/wallet");
  revalidatePath("/settings/phone");
  return ok({ last: phone.slice(-4) });
}
