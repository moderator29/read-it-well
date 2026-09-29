import "server-only";

import { getDictionary } from "@vallo/i18n";
import { callRpc } from "./rpc";

/**
 * SCUML item 20: before a payout account is added, the lister has answered the
 * PEP question at least once. Null when they have; the refusal otherwise. A
 * failed read refuses too, because an unanswered question cannot be assumed
 * answered. The function is live (20260929004739); a missing function is a
 * failure like any other, never a pass.
 */
export async function pepQuestionRefusal(client: object): Promise<string | null> {
  const copy = getDictionary("en").compliancePep.question;
  const { data, error } = await callRpc(client, "my_pep_answered_at");
  if (error) return copy.checkFailed;
  return typeof data === "string" ? null : copy.payoutFirst;
}

/**
 * The same check for the member bank-account path, asked only of somebody
 * with an agents row. A failed read of that row refuses, as above.
 */
export async function listerPepRefusal(client: object, userId: string): Promise<string | null> {
  const copy = getDictionary("en").compliancePep.question;
  type AgentsRead = {
    from: (t: string) => {
      select: (c: string) => {
        eq: (k: string, v: string) => {
          limit: (n: number) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
        };
      };
    };
  };
  const { data, error } = await (client as AgentsRead)
    .from("agents")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) return copy.checkFailed;
  if (!data) return null;
  return pepQuestionRefusal(client);
}
