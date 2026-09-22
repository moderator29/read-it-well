import "server-only";

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

  let outcome: "sent" | "skipped" = "skipped";
  await bestEffortEmail(async () => {
    const admin = createAdminClient();
    const contact = await contactForUser(admin, userId);
    if (!contact) return;
    const result = await sendMessage(contact.email, welcome({ name: contact.name, role }));
    outcome = result.sent ? "sent" : "skipped";
  });
  return outcome;
}

const DAY_MS = 24 * 60 * 60 * 1000;
