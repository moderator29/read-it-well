import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isFreshEmailProof } from "./recovery-session";

/**
 * What /reset-password must ask for before a new password is set.
 *
 * - `none`: this session came from a recovery link or an emailed code in the
 *   last half hour, which is the same proof the forgot-password email gives.
 * - `current-password`: any other session. A stolen session must not be
 *   enough to change the password and end every other device.
 * - `link-only`: no password on the account (a Google or Apple sign-in) and
 *   no fresh email proof, so the emailed link is the only way in.
 *
 * The `amr` claim is read through `getClaims`, which verifies the token's
 * signature, never from an unverified cookie.
 */
export type PasswordChangeProof = "none" | "current-password" | "link-only";

export async function passwordChangeProof(supabase: SupabaseClient, user: User): Promise<PasswordChangeProof> {
  let amr: unknown = null;
  try {
    const { data } = await supabase.auth.getClaims();
    amr = (data?.claims as { amr?: unknown } | undefined)?.amr ?? null;
  } catch {
    amr = null;
  }
  if (isFreshEmailProof(amr, Math.floor(Date.now() / 1000))) return "none";
  const hasPassword = (user.identities ?? []).some((identity) => identity.provider === "email");
  return hasPassword ? "current-password" : "link-only";
}
