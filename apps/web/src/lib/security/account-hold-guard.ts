import "server-only";

import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { formatHoldUntil, isAccountHoldError, loadAccountHold } from "./account-hold";

/**
 * The sentence a withdrawal or a send is refused with while a "this was not
 * me" hold stands (V-19), or null when there is no hold to speak of.
 *
 * Asked by `withdraw` and `transferToUser` before anything is resolved at the
 * bank or held in the ledger, so the refusal costs nothing and arrives in
 * words, and again when the audit's hold trigger refused a call that raced
 * past the first check. The rule itself is the audit's
 * (`public.account_money_holds`, `wallet_entries_00_money_hold`). An unreadable hold returns null here on purpose
 * (see `account-hold.ts`): the trigger still holds the line, and blocking
 * every withdrawal on a failed read would be an outage, not a safeguard.
 */
export async function accountHoldRefusal(client: unknown): Promise<string | null> {
  const hold = await loadAccountHold(client);
  if (hold.state !== "held") return null;
  const locale = await getLocale();
  const until = formatHoldUntil(hold.until, locale);
  const copy = getDictionary(locale).platform.hold;
  return (hold.reason === "not_me" ? copy.refusalNotMe : copy.refusalOther).replace("{until}", until);
}

/**
 * The sentence for a money call the hold trigger refused (a race past the
 * check above). Null when the failure was something else.
 */
export async function holdRefusalForFailure(client: unknown, reason: string): Promise<string | null> {
  if (!isAccountHoldError(reason)) return null;
  return (await accountHoldRefusal(client)) ?? getDictionary(await getLocale()).platform.hold.refusalUnknown;
}
