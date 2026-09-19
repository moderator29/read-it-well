import { GRACE_WINDOW_DAYS } from "@/lib/account-deletion/constants";

/**
 * What the sign-in door says to somebody whose account is waiting to be
 * deleted, and how it recognises them.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A MODULE AND NOT THREE LINES INSIDE THE ACTION.
 *
 * `lib/auth/actions.ts` carries `"use server"`, so it may export async
 * functions and nothing else: a helper declared in there can never be reached
 * by a test. The fragile part of this feature is a STRING MATCH AGAINST AN
 * UPSTREAM ERROR MESSAGE, which is exactly the part that has to be tested,
 * because the failure mode when it stops matching is silent - the branch goes
 * quiet and GoTrue's own word lands back on the screen with nobody warned.
 *
 * ---------------------------------------------------------------------------
 * THE MECHANISM, BECAUSE THE WORDING DEPENDS ON IT.
 *
 * During the grace window the account is BANNED in GoTrue on purpose. That
 * makes "deactivated" a fact the auth layer enforces rather than a flag every
 * screen in the product has to remember, and it means no token can be minted
 * for the row at all, which is a far stronger guarantee than a column nobody
 * checks. The cost is this one message.
 *
 * IT SAYS DEACTIVATED, NEVER BANNED. Banned is what the auth layer does;
 * deactivated is what the person asked for. Naming the mechanism instead of
 * the request would read as a punishment for closing an account, which is the
 * opposite of what happened.
 */

/**
 * Whether an auth error is the deletion grace window rather than a bad
 * password.
 *
 * MATCHED ON THE WORD ALONE, not on GoTrue's exact sentence ("User is
 * banned") and not on its `user_banned` code. The wording of an upstream
 * error string is not a contract, and the `@supabase/supabase-js` surface
 * does not carry that code on every error shape it returns. A broad match is
 * safe here because nothing else in this product's auth vocabulary contains
 * the word: the other branches are about credentials, confirmation, rate
 * limits and password strength.
 */
export function isDeactivatedAccountError(raw: string): boolean {
  return raw.toLowerCase().includes("banned");
}

/** Where the restore code is typed. The anchor is the form, not the page. */
export const RESTORE_HREF = "/delete-account#restore";

export function deactivatedAccountNotice(): {
  message: string;
  action: { href: string; label: string };
} {
  return {
    message:
      `This account is deactivated while it waits to be deleted. You have ${GRACE_WINDOW_DAYS} days ` +
      "from the day you asked, and the email we sent carries your restore code. " +
      "Enter it and everything comes back.",
    action: { href: RESTORE_HREF, label: "Restore this account" },
  };
}
