import "server-only";

import { isPaystackConfigured, listBanks, type PaystackBank } from "../payments/paystack";
import { getAgentContext } from "./listings-queries";

/**
 * Read side of the payout accounts loop.
 *
 * Every read goes through the agent's own RLS-bound client: payout_accounts_own
 * scopes rows by walking agents.user_id, so another agent's bank details simply
 * do not come back. Nothing here uses the service role.
 */

export type PayoutAccount = {
  id: string;
  bankName: string;
  /** Bare ten digits as stored. The UI groups it for display. */
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
};

export type PayoutRead =
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "not-agent" }
  | { state: "unavailable" }
  | {
      state: "ready";
      accounts: PayoutAccount[];
      /** Banks to choose from. Empty when Paystack has no key yet. */
      banks: PaystackBank[];
      /** False until the Paystack key lands, which the surface says out loud. */
      resolveAvailable: boolean;
    };

export async function getPayoutAccounts(): Promise<PayoutRead> {
  const context = await getAgentContext();
  if (context.state === "unconfigured") return { state: "unconfigured" };
  if (context.state === "signed-out") return { state: "signed-out" };
  if (context.state === "not-agent") return { state: "not-agent" };

  try {
    const { data, error } = await context.supabase
      .from("payout_accounts")
      .select("id, bank_name, account_number, account_name, is_default")
      .eq("agent_id", context.agent.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) return { state: "unavailable" };

    const accounts: PayoutAccount[] = (data ?? []).map((row) => ({
      id: row.id,
      bankName: row.bank_name,
      accountNumber: row.account_number,
      accountName: row.account_name,
      isDefault: row.is_default,
    }));

    // The bank list is a Paystack read, so it degrades to empty rather than
    // taking the page down when the key has not landed yet.
    let banks: PaystackBank[] = [];
    const resolveAvailable = isPaystackConfigured();
    if (resolveAvailable) {
      try {
        banks = await listBanks();
      } catch {
        banks = [];
      }
    }

    return { state: "ready", accounts, banks, resolveAvailable };
  } catch {
    return { state: "unavailable" };
  }
}
