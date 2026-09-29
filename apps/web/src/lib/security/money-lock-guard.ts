import "server-only";

import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import type { MoneyIntent } from "./money-intent";
import { moneyStepUpRefusal } from "./money-step-up";
import { passcodeMoneyRefusal } from "../passcode/money";

/**
 * The sentence a money action is refused with when this person has locked
 * money with their phone (V-81) and the request carried no fresh proof FOR
 * THIS ACTION, or null. The proof is spent here, once; its digest must match
 * the intent rebuilt from the request itself.
 */
export async function moneyLockRefusalFor(userId: string, stepUp: unknown, intent: MoneyIntent): Promise<string | null> {
  /* Before the step-up is spent: a locked session (docs/PASSCODE.md) changes no payout account. */
  const locked = await passcodeMoneyRefusal(userId);
  if (locked) return locked;
  const refusal = await moneyStepUpRefusal(userId, typeof stepUp === "string" ? stepUp : null, intent);
  if (!refusal) return null;
  return getDictionary(await getLocale()).platform.moneyLock.needed;
}
