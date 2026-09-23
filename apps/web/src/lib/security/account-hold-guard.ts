import "server-only";

import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { formatHoldUntil, loadAccountHold } from "./account-hold";

/**
 * The sentence a withdrawal or a send is refused with while a "this was not
 * me" hold stands (V-19), or null when there is no hold to speak of.
 *
 * Asked by `withdraw` and `transferToUser` before anything is resolved at the
 * bank or held in the ledger, so the refusal costs nothing and arrives in
 * words. It is the courtesy half: the rule is the ledger trigger
 * `wallet_entries_refuse_during_account_hold`, which refuses the insert
 * whatever door writes it. An unreadable hold returns null here on purpose
 * (see `account-hold.ts`): the trigger still holds the line, and blocking
 * every withdrawal on a failed read would be an outage, not a safeguard.
 */
export async function accountHoldRefusal(client: unknown): Promise<string | null> {
  const hold = await loadAccountHold(client);
  if (hold.state !== "held") return null;
  const locale = await getLocale();
  const until = formatHoldUntil(hold.until, locale);
  return getDictionary(locale).platform.hold.refusal.replace("{until}", until);
}
