"use server";

/**
 * Bank accounts, user-scoped: where a guest's refund or a host's payout goes.
 *
 * Two rules, both inherited from lib/agent/payout-actions.ts and both kept.
 *
 * First, the stored name never comes from the person filing the account. The
 * bank is asked inside the same action that inserts, and the column being NOT
 * NULL makes resolve-before-save structural rather than polite.
 *
 * Second, the invariants are the database's: one default per person, no
 * duplicate NUBAN per person, ten digits, rows scoped to the caller. Every
 * write goes through the caller's own RLS-bound client and the service role
 * is never used here: a bank account written as the service role would bypass
 * the ownership check that is the whole point.
 *
 * Removing an account is a soft delete. There is no delete policy.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import type { BankAccountRow } from "./db";
import {
  PaystackError,
  isPaystackConfigured,
  listBanks as fetchBanks,
  resolveAccountNumber,
  type PaystackBank,
} from "./paystack";

const SERVICE_DOWN_MESSAGE =
  "We could not save that just then. Nothing was lost, please try again in a moment.";

const UNVERIFIABLE_MESSAGE =
  "We cannot confirm a bank account right now, and we will not store an account we cannot confirm belongs to you.";

const NOT_CONFIRMED_MESSAGE =
  "That account could not be confirmed. Check the number and the bank, then try again.";

const NOT_YOURS_MESSAGE =
  "We could not find that account on your list. Reload the page to see the accounts you have.";

/** One account as the settings page shows it. */
export type BankAccount = {
  id: string;
  bankCode: string;
  bankName: string;
  /** Bare ten digits as stored. The UI groups it for display. */
  accountNumber: string;
  /** The bank's answer, never the person's typing. */
  accountName: string;
  isDefault: boolean;
  createdAt: string;
};

const accountNumberSchema = z
  .string({ message: "Enter the ten digit account number." })
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => /^\d{10}$/.test(value), "A Nigerian account number is exactly ten digits.");

const bankAccountInputSchema = z.object({
  bankCode: z.string().trim().min(1, "Choose the bank."),
  accountNumber: accountNumberSchema,
});

const bankAccountIdSchema = z.object({
  id: z.uuid("That account could not be identified."),
});

function toBankAccount(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    bankCode: row.bank_code,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.resolved_account_name,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

/* ------------------------------------------------------------------- banks */

/** The registry changes rarely and the page asks often. One hour, in memory. */
const BANKS_TTL_MS = 60 * 60 * 1000;
let banksCache: { at: number; banks: PaystackBank[] } | null = null;

async function cachedBanks(): Promise<PaystackBank[]> {
  const now = Date.now();
  if (banksCache && now - banksCache.at < BANKS_TTL_MS) return banksCache.banks;
  const banks = await fetchBanks();
  banksCache = { at: now, banks };
  return banks;
}

/** Nigerian banks Paystack can pay out to, cached for an hour per instance. */
export async function listBanks(): Promise<ActionResult<PaystackBank[]>> {
  if (!isPaystackConfigured()) return ok([]);
  try {
    return ok(await cachedBanks());
  } catch {
    return fail("The bank list could not be loaded just now. Please try again in a moment.");
  }
}

/* ----------------------------------------------------------------- resolve */

/**
 * Step one: ask the bank whose account this is. Nothing is stored. The person
 * sees the real name and decides whether it is theirs.
 */
export async function resolveBankAccount(input: {
  bankCode: string;
  accountNumber: string;
}): Promise<ActionResult<{ accountName: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!isPaystackConfigured()) return fail(UNVERIFIABLE_MESSAGE);

  const parsed = validate(bankAccountInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  try {
    const resolved = await resolveAccountNumber(parsed.data.accountNumber, parsed.data.bankCode);
    return ok({ accountName: resolved.accountName });
  } catch (error) {
    if (error instanceof PaystackError) {
      return fail(NOT_CONFIRMED_MESSAGE, { accountNumber: "We could not confirm this account." });
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }
}

/* --------------------------------------------------------------------- add */

/**
 * Step two: store it, with the name the bank gave rather than any the form
 * carried. The account is re-resolved here regardless of what step one said,
 * so a tampered value can never be stored.
 */
export async function addBankAccount(input: {
  bankCode: string;
  accountNumber: string;
}): Promise<ActionResult<BankAccount>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!isPaystackConfigured()) return fail(UNVERIFIABLE_MESSAGE);

  const parsed = validate(bankAccountInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  let bankName: string | null = null;
  try {
    bankName = (await cachedBanks()).find((b) => b.code === parsed.data.bankCode)?.name ?? null;
  } catch {
    bankName = null;
  }
  if (!bankName) {
    return fail("Choose a bank from the list.", { bankCode: "Choose a bank from the list." });
  }

  let accountName: string;
  try {
    const resolved = await resolveAccountNumber(parsed.data.accountNumber, parsed.data.bankCode);
    accountName = resolved.accountName;
  } catch (error) {
    if (error instanceof PaystackError) {
      return fail(NOT_CONFIRMED_MESSAGE, { accountNumber: "We could not confirm this account." });
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }

  const { data: created, error } = await session.supabase
    .from("bank_accounts")
    .insert({
      user_id: session.user.id,
      bank_code: parsed.data.bankCode,
      bank_name: bankName,
      account_number: parsed.data.accountNumber,
      resolved_account_name: accountName,
      resolved_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !created) {
    // 23505 is the per-person unique NUBAN among live rows.
    if (error?.code === "23505") {
      return fail(
        "You have already added that account. It is in your list, where you can make it the default.",
        { accountNumber: "This account is already on your list." },
      );
    }
    // 23514 is the ten-digit check constraint.
    if (error?.code === "23514") {
      return fail("A Nigerian account number is exactly ten digits.", {
        accountNumber: "A Nigerian account number is exactly ten digits.",
      });
    }
    return fail(SERVICE_DOWN_MESSAGE);
  }

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  revalidatePath("/wallet");
  return ok(toBankAccount(created));
}

/* ---------------------------------------------------------- default, remove */

/** Make one account the one money is sent to. The database keeps it single. */
export async function setDefaultBankAccount(id: string): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(bankAccountIdSchema, { id });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error, count } = await session.supabase
    .from("bank_accounts")
    .update({ is_default: true }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null);
  if (error) return fail(SERVICE_DOWN_MESSAGE);
  if (count === 0) return fail(NOT_YOURS_MESSAGE);

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  revalidatePath("/wallet");
  return ok(null);
}

/** Remove an account from the list. Soft: the database promotes a survivor. */
export async function removeBankAccount(id: string): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(bankAccountIdSchema, { id });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const { error, count } = await session.supabase
    .from("bank_accounts")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null);
  if (error) return fail(SERVICE_DOWN_MESSAGE);
  if (count === 0) return fail(NOT_YOURS_MESSAGE);

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  revalidatePath("/wallet");
  return ok(null);
}

/* -------------------------------------------------------------------- list */

/** The caller's live accounts, default first, then oldest. */
export async function listBankAccounts(): Promise<ActionResult<BankAccount[]>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const { data, error } = await session.supabase
    .from("bank_accounts")
    .select("*")
    .eq("user_id", session.user.id)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) return fail("We could not reach your bank accounts just now. Please try again in a moment.");
  return ok((data ?? []).map(toBankAccount));
}
