import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { createSubaccount, isPaystackConfigured } from "./paystack";

/**
 * TRACK A: WHERE A LISTER'S SHARE SETTLES.
 *
 * Every charge is split by Paystack at the moment of payment, and the
 * lister's share goes to a Paystack subaccount tied to their own bank account
 * (`private.payee_subaccount` reads it). A payout account without one cannot
 * be paid into, so a payment against that lister does not open.
 *
 * Called with the service client after a payout account is added or made the
 * default. Idempotent: an account that already has a code is left alone.
 * Best effort: the account is saved either way, and the next default change
 * or add tries again. Returns the code, or null.
 */
export async function ensurePayeeSubaccount(
  admin: SupabaseClient<Database>,
  accountId: string,
): Promise<string | null> {
  if (!isPaystackConfigured()) return null;
  const { data: account } = await admin
    .from("payout_accounts")
    .select("id, bank_code, account_number, account_name, paystack_subaccount_code")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return null;
  if (account.paystack_subaccount_code) return account.paystack_subaccount_code;
  if (!account.bank_code || !account.account_number) return null;
  try {
    const { subaccountCode } = await createSubaccount({
      businessName: account.account_name ?? "Vallo lister",
      bankCode: account.bank_code,
      accountNumber: account.account_number,
      description: `Vallo payout account ${account.id}`,
    });
    const { error } = await admin
      .from("payout_accounts")
      .update({ paystack_subaccount_code: subaccountCode, subaccount_created_at: new Date().toISOString() })
      .eq("id", account.id)
      .is("paystack_subaccount_code", null);
    return error ? null : subaccountCode;
  } catch {
    return null;
  }
}
