import "server-only";

/*
 * RESTORED 23 SEPTEMBER. This file was DELETED by commit `7da4b0d0`, which was
 * about push transports and had no reason to touch it, while
 * `lib/auth/actions.ts` still imported `welcomeOnce` from it. Main went red on
 * eight tests in two files, and the failure did not name this file: it named a
 * module resolution error inside `actions.ts`, which is why nobody reading the
 * shared worktree saw it. The shared worktree could not see it either, because
 * five workers' in-flight edits were masking the tip.
 *
 * The content below is byte for byte what `7da4b0d0^` held. Nothing was
 * rewritten, because a restore that improves something is a restore nobody can
 * check. See ledger section 61.
 */

import { bestEffortEmail, sendMessage } from "@/lib/email/client";
import { welcome, type SignupRole } from "@/lib/email/messages";
import { contactForUser } from "@/lib/email/recipients";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The first email this platform sends, and the thing that makes it send once.
 *
 * `welcome` has existed complete since the catalogue was written, in six
 * versions, and has never had a caller. Nobody who has ever signed up here has
 * received it.
 *
 * WHY IT FIRES ON CONFIRMATION AND NOT ON SIGN-UP. At the moment somebody
 * presses Create account the address is a claim. Mailing an unconfirmed
 * address is how a platform becomes the delivery mechanism for somebody else's
 * abuse: type a stranger's address, and we send them mail. The address becomes
 * a fact when it is confirmed, so that is where this hangs, on both of the two
 * paths that confirm one.
 *
 * WHY EXACTLY ONCE IS THE DATABASE'S ANSWER AND NOT THIS MODULE'S. Both paths
 * end in the same place and a person can open the emailed link twice. The
 * claim below is a CONDITIONAL UPDATE: set the stamp where it is still null,
 * and send only if a row came back. Two concurrent confirmations race on the
 * row lock, one wins, and exactly one email leaves. A read then a write would
 * send two.
 *
 * WHY THE ROLE IS READ AND NEVER GUESSED. `welcome` writes six versions, and
 * `profiles.signup_role` carries the one the person declared. When it is null
 * they were never asked or they skipped, and the general version goes: the
 * catalogue says plainly that it is not a lesser version but the honest answer
 * when nothing was declared. Inferring a role from the occupation in order to
 * pick a nicer email would be inventing a fact about a person.
 */
export async function welcomeOnce(userId: string): Promise<"sent" | "already" | "skipped"> {
  let claimed = false;
  let role: SignupRole | null = null;
  try {
    const admin = createAdminClient();

    /*
     * REFUSE ON AN ACCOUNT THAT IS NOT NEW. The stamp is on `profiles`, which
     * its owner can write, so a person could null their own and collect a
     * second welcome. Rather than restructure the table grants on the most
     * read table in the product, the send site refuses anything confirmed more
     * than a day ago. See the migration's note.
     */
    const { data: account } = await admin.auth.admin.getUserById(userId);
    const confirmedAt = account?.user?.email_confirmed_at ?? null;
    if (!confirmedAt) return "skipped";
    if (Date.now() - Date.parse(confirmedAt) > DAY_MS) return "skipped";

    const { data } = await admin
      .from("profiles")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcomed_at", null)
      .select("id, signup_role")
      .maybeSingle();
    claimed = Boolean(data);
    role = data?.signup_role ?? null;
  } catch {
    /* No service key, no profile row, an unreachable database: all of them
       mean no welcome, and none of them may interrupt somebody signing in. */
    return "skipped";
  }

  if (!claimed) return "already";

  let sent = false;
  await bestEffortEmail(async () => {
    const admin = createAdminClient();
    const contact = await contactForUser(admin, userId);
    if (!contact) return;
    const result = await sendMessage(contact.email, welcome({ name: contact.name, role }));
    sent = result.sent;
  });

  /*
   * A CLAIM THAT SENT NOTHING IS GIVEN BACK.
   *
   * The stamp exists to make the send happen ONCE, not to make it happen
   * never. Claiming and then failing would burn the welcome permanently, and
   * the commonest way to fail is not an outage: `bestEffortEmail` does
   * nothing at all when there is no Resend key, which is the state of any
   * deployment that has not been given one. Every account created before the
   * key arrived would have been marked as welcomed and never written to.
   *
   * So the stamp is released on anything but a confirmed send, and the next
   * confirmation, or the next thing that calls this, tries again. The race
   * this column exists for is still closed, because the release only happens
   * on the one call that WON the claim and then got nothing for it.
   */
  if (!sent) {
    try {
      await createAdminClient()
        .from("profiles")
        .update({ welcomed_at: null })
        .eq("id", userId);
    } catch {
      /* The stamp stays. One lost welcome is a smaller harm than an
         exception on somebody's first sign-in. */
    }
  }

  return sent ? "sent" : "skipped";
}

const DAY_MS = 24 * 60 * 60 * 1000;
