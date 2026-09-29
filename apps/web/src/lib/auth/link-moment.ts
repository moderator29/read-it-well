import type { DoneFlag } from "@/lib/ui/success-moments";

/**
 * The success moment an email link earns on arrival, from Supabase's `type`.
 *
 *   signup        a sign-up confirmation made the account just now:
 *                 "Welcome to Vallo".
 *   email_change  a confirmed address change: "Email confirmed".
 *
 * Everything else says nothing. `email` in particular is ALSO what a magic
 * link sign-in carries (Supabase uses one type for both), so a returning
 * member signing in by link would have been told their email was confirmed.
 * A provider round trip cannot tell a new account from a returning one, and a
 * recovery link goes on to choose a password, which has its own moment.
 */
export function doneFlagForLinkType(type: string | undefined | null): DoneFlag | null {
  if (type === "signup") return "account-created";
  if (type === "email_change") return "email-verified";
  return null;
}
