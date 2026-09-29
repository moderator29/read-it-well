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

/**
 * ROOM BOOKINGS 1: WHERE A HOTEL HOST'S SHARE SETTLES.
 *
 * A host who is not an agent has no payout account; they are paid into the
 * default bank account they added in payment settings, and
 * `private.payee_subaccount` falls back to that account's Paystack
 * subaccount. This creates it for a business owner's account, in the Paystack
 * mode the server is running in. Idempotent and best effort, like the
 * lister's: nothing a person does fails because this could not run, and the
 * next add, default change or accepted room request tries again. Called with
 * the service client. Returns the code, or null.
 */
export async function ensureHostSubaccount(
  admin: SupabaseClient<Database>,
  userId: string,
  bankAccountId?: string,
): Promise<string | null> {
  if (!isPaystackConfigured()) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loose = admin as any;
  try {
    const { data: owned } = await loose
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .neq("kind", "agency")
      .limit(1);
    if (!Array.isArray(owned) || owned.length === 0) return null;
    let query = loose
      .from("bank_accounts")
      .select("id, bank_code, account_number, resolved_account_name, paystack_subaccount_code")
      .eq("user_id", userId)
      .is("deleted_at", null);
    query = bankAccountId ? query.eq("id", bankAccountId) : query.eq("is_default", true);
    const { data: account } = await query.maybeSingle();
    const row = account as {
      id: string;
      bank_code: string | null;
      account_number: string | null;
      resolved_account_name: string | null;
      paystack_subaccount_code: string | null;
    } | null;
    if (!row) return null;
    if (row.paystack_subaccount_code) return row.paystack_subaccount_code;
    if (!row.bank_code || !row.account_number) return null;
    const { subaccountCode } = await createSubaccount({
      businessName: row.resolved_account_name ?? "Vallo host",
      bankCode: row.bank_code,
      accountNumber: row.account_number,
      description: `Vallo host bank account ${row.id}`,
    });
    const { error } = await loose
      .from("bank_accounts")
      .update({ paystack_subaccount_code: subaccountCode, subaccount_created_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("paystack_subaccount_code", null);
    return error ? null : subaccountCode;
  } catch {
    return null;
  }
}
