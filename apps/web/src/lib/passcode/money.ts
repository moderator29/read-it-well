import "server-only";

import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { moneyAllowed } from "./decide";
import { resolvePasscodeGate } from "./state";

/**
 * A LOCKED SESSION MOVES NO MONEY.
 *
 * The lock screen stands in front of every page under the (app) layout, but a
 * server action is a POST anybody holding the session cookie can make, so
 * every payment, payout and payout-account change asks here as well:
 * `guardMoney` (`lib/security/money-limits.ts`) for the payment and bank
 * paths and `moneyLockRefusalFor` (`lib/security/money-lock-guard.ts`) for
 * the payout paths. FAILS CLOSED: anything that cannot be read refuses.
 *
 * Null means go ahead; a string is the sentence to refuse with.
 */
export async function passcodeMoneyRefusal(userId: string): Promise<string | null> {
  try {
    const { view, userId: gateUser } = await resolvePasscodeGate();
    if (gateUser === userId && moneyAllowed(view)) return null;
  } catch {
    /* Refused below. */
  }
  try {
    return getDictionary(await getLocale()).passcode.moneyLocked;
  } catch {
    return "Unlock Vallo with your passcode first. Nothing was charged or changed.";
  }
}
