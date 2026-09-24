import "server-only";

import { getDictionary } from "@vallo/i18n";
import { callRpc } from "./rpc";

/**
 * SCUML item 20: before a payout account is added, the lister has answered the
 * PEP question at least once. Null when they have; the refusal otherwise. A
 * failed read refuses too, because an unanswered question cannot be assumed
 * answered.
 */
export async function pepQuestionRefusal(client: object): Promise<string | null> {
  const copy = getDictionary("en").compliancePep.question;
  const { data, error } = await callRpc(client, "my_pep_answered_at");
  if (error) return copy.checkFailed;
  return typeof data === "string" ? null : copy.payoutFirst;
}
