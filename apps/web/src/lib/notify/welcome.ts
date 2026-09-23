import "server-only";

/*
 * RESTORED 23 SEPTEMBER. This file was DELETED by commit `7da4b0d0`, which was
 * about push transports and had no reason to touch it, while
 * `lib/auth/actions.ts` still imported `welcomeOnce` from it. Main went red on
 * eight tests in two files, and the failure did not name this file: it named a
 * module resolution error inside `actions.ts`, which is why the cause was not
 * obvious, and a working tree with uncommitted edits did not show it at all.
 *
 * The restore was byte for byte what `7da4b0d0^` held.
 *
 * WHAT CHANGED AFTERWARDS, AND IT IS ONLY THE LAST STEP. The claim, the
 * confirmation guard and the day window below are untouched. The send is not a
 * send any more: it is an ENQUEUE onto `public.email_outbox`, so the welcome
 * gets the durability, the backoff, the dedupe and the desk alarm that every
 * other email on the junction already has, instead of one best-effort POST
 * that vanished if Resend blinked.
 */

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The first email this platform sends, and the thing that makes it send once.
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
 * and act only if a row came back. Two concurrent confirmations race on the
 * row lock and one wins. A read then a write would queue two.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE SECOND OF TWO PATHS, AND THE FIRST ONE IS THE ONE THAT COVERS
 * EVERYBODY. Read this before deciding either is redundant.
 *
 * `users_enqueue_welcome_email_on_insert` and `..._on_confirm`, both on
 * `auth.users`, enqueue the same row in the SAME TRANSACTION as the
 * confirmation. They exist because THESE TWO CALL SITES ARE ONE DOOR OF FIVE:
 * Continue with Google, an invite and the admin API each mint a confirmed
 * account inside GoTrue and return through a callback that has never heard of
 * this function. For weeks the two call sites looked like coverage and were
 * not.
 *
 * This module is kept as the belt to that pair of braces, because `auth` is
 * not our schema and a trigger is one object that a GoTrue upgrade, a restore
 * from an older snapshot, or a migration written by somebody who did not know
 * it was there can remove without a sound.
 *
 * AND THE TWO CANNOT MAKE TWO EMAILS. Both compose the same dedupe key,
 * `account:welcome:<user id>`, and `email_outbox_dedupe_key` is UNIQUE with
 * `on conflict do nothing` underneath, so whichever arrives first writes the
 * row and the other is told `already`. That is proven in the migration's own
 * probe, not argued here.
 *
 * ---------------------------------------------------------------------------
 * WHY THE ROLE IS NOT READ HERE ANY MORE. It used to be selected alongside the
 * claim and handed to `welcome`. The drain reads `profiles.signup_role` at
 * send time instead, which keeps a statement somebody made about themselves
 * out of the queue row, and is also more correct: confirm, then answer the
 * first run question, then the drain runs, and the version matches what was
 * actually said. The builder itself is not imported here at all any more:
 * this module queues an event, and `lib/notify/templates.ts` under the key
 * `account.welcome` is the only place that decides what the words are.
 */
export async function welcomeOnce(userId: string): Promise<"queued" | "already" | "skipped"> {
  let claimed = false;
  try {
    const admin = createAdminClient();

    /*
     * REFUSE ON AN ACCOUNT THAT IS NOT NEW. The stamp is on `profiles`, which
     * its owner can write, so a person could null their own and come back for
     * a second welcome. That hole is now closed twice over, because the outbox
     * key is unique for ever on a table nobody but the service role can touch,
     * but the day window is kept: it is what stops this function queueing
     * anything at all for an old account, which is a cheaper refusal than one
     * that has to reach the outbox to be turned down.
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
      .select("id")
      .maybeSingle();
    claimed = Boolean(data);
  } catch {
    /* No service key, no profile row, an unreachable database: all of them
       mean no welcome from this path, and none of them may interrupt somebody
       signing in. The trigger has already queued the row in any case. */
    return "skipped";
  }

  if (!claimed) return "already";

  let answer: string | null = null;
  try {
    const { data } = await (
      createAdminClient() as unknown as {
        rpc: (
          fn: string,
          args: Record<string, unknown>,
        ) => PromiseLike<{ data: unknown; error: unknown }>;
      }
    ).rpc("email_outbox_enqueue_welcome", { p_user: userId });
    answer = typeof data === "string" ? data : null;
  } catch {
    answer = null;
  }

  /*
   * A CLAIM THAT QUEUED NOTHING IS GIVEN BACK.
   *
   * The stamp exists to make this happen ONCE, not to make it happen never.
   * Claiming and then failing would burn the welcome permanently, and the
   * commonest failure is not an outage: it is a deployment with no service key
   * at all. So the stamp is released on anything but a row that is now in the
   * queue, and the next confirmation tries again.
   *
   * `already` counts as success and keeps the stamp. It means the trigger got
   * there first, which is the ordinary case and the whole design: the email is
   * queued, and releasing the stamp then would leave a column disagreeing with
   * a queue that is about to send.
   */
  const queued = answer === "queued" || answer === "already";
  if (!queued) {
    try {
      await createAdminClient().from("profiles").update({ welcomed_at: null }).eq("id", userId);
    } catch {
      /* The stamp stays. One lost claim on a path that is the SECOND of two is
         a smaller harm than an exception on somebody's first sign-in, and the
         trigger's row is unaffected by any of this. */
    }
  }

  return queued ? "queued" : "skipped";
}

const DAY_MS = 24 * 60 * 60 * 1000;
