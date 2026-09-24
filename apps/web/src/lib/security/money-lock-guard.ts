import "server-only";

import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";
import { moneyStepUpRefusal } from "./money-step-up";

/**
 * The sentence a withdrawal or a send is refused with when this person has
 * locked money with their phone (V-81) and the form carried no fresh proof,
 * or null. The proof is spent here, once.
 */
export async function moneyLockRefusal(userId: string, formData: FormData): Promise<string | null> {
  const stepUp = formData.get("stepUp");
  const refusal = await moneyStepUpRefusal(userId, typeof stepUp === "string" ? stepUp : null);
  if (!refusal) return null;
  return getDictionary(await getLocale()).platform.moneyLock.needed;
}
