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

import { moneyHoldRefusal } from "@/lib/money/hold";
import { ensureHostSubaccount } from "./payee-subaccount";
import { eddGateMessage, isEddGateRefusal } from "../compliance/gate";
import { listerPepRefusal } from "../compliance/pep-gate";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { setupExempt } from "../actions/setup-exempt";
import { IN_FLIGHT_MESSAGE, withIdempotency } from "../security/idempotency";
import { guardMoney } from "../security/money-limits";
import { accountHoldRefusal } from "../security/account-hold-guard";
import { moneyLockRefusalFor } from "../security/money-lock-guard";
import { subjectForUser } from "../security/rate-limit";
import { recordMoneyAudit } from "@/lib/money/audit";
import { getAdminClient } from "@/lib/supabase/service";
import type { BankAccountRow } from "./db";
import {
  bankAccountAddedNotice,
  bankAccountRemovedNotice,
  bankDefaultChangedNotice,
} from "./notices";
import { isPaystackConfigured, type PaystackBank } from "./paystack";
import {
  accountNumberSchema,
  cachedBanks,
  lookupBank,
  resolveBankAccountName,
} from "./bank-resolve";

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

/* The digits rule, the registry and the resolve call all live in
   ./bank-resolve, which is the single implementation every caller on this
   platform asks. See the note at the top of that file for what went wrong
   when there were two. */

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

  /* Every resolution is a paid call to Paystack, so it is counted even
     though nothing is stored. */
  const limit = await guardMoney("resolveBankAccount", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const resolved = await resolveBankAccountName(parsed.data);
  if (resolved.ok) return ok({ accountName: resolved.accountName });
  if (resolved.failure === "not-confirmed") {
    return fail(NOT_CONFIRMED_MESSAGE, { accountNumber: "We could not confirm this account." });
  }
  if (resolved.failure === "unconfigured") return fail(UNVERIFIABLE_MESSAGE);
  return fail(SERVICE_DOWN_MESSAGE);
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
  /**
   * One key per tap, from the client. A dropped response followed by a second
   * tap replays the first answer instead of paying for a second resolution.
   */
  idempotencyKey?: string;
  /** V-81: a fresh proof for exactly this, when the person locked money with a phone. */
  stepUp?: string;
}): Promise<ActionResult<BankAccount>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  if (!isPaystackConfigured()) return fail(UNVERIFIABLE_MESSAGE);

  const parsed = validate(bankAccountInputSchema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const limit = await guardMoney("addBankAccount", session.user.id);
  if (!limit.allowed) return fail(limit.message);
  /* V-19: while a money hold stands, adding an account is refused by the
     audit's trigger; say so in words before Paystack is paid to resolve it. */
  const accountHold = await accountHoldRefusal(session.supabase);
  if (accountHold) return fail(accountHold);
  /* SCUML item 20: a lister answers the PEP question before adding an
     account to be paid into, the same as on the payout path. A member looking
     for a home is never asked. */
  const pepFirst = await listerPepRefusal(session.supabase, session.user.id);
  if (pepFirst) return fail(pepFirst);
  /* V-81: a new account to be paid into; an enrolled phone lock asks first. */
  const bankLock = await moneyLockRefusalFor(session.user.id, input.stepUp, {
    kind: "bank_add",
    target: `${parsed.data.bankCode}:${parsed.data.accountNumber}`,
  });
  if (bankLock) return fail(bankLock);

  /* IDEMPOTENT FROM HERE. The resolution below is a paid call to Paystack and
     the insert below that is the row somebody gets paid into. The allowance
     is five an hour, so a network that eats two responses costs a person
     nearly half their allowance for the day unless a retry of the same tap
     replays rather than repeats. `shouldRecord: (r) => r.ok` keeps a genuine
     refusal retryable: a person who mistyped one digit must be able to fix it
     immediately rather than be handed the same refusal for the whole TTL. */
  const run = await withIdempotency<ActionResult<BankAccount>>(
    {
      scope: BANK_ACCOUNT_SCOPE,
      key: input.idempotencyKey ?? null,
      subject: subjectForUser(session.user.id),
      shouldRecord: (result) => result.ok,
    },
    () => addBankAccountWork(session.user.id, parsed),
  );
  if (run.status === "in-flight") return fail(IN_FLIGHT_MESSAGE);
  return run.result;
}

/** The action family this desk's retries are remembered under. */
const BANK_ACCOUNT_SCOPE = "payments.bank.add";

async function addBankAccountWork(
  userId: string,
  parsed: { data: { bankCode: string; accountNumber: string } },
): Promise<ActionResult<BankAccount>> {

  /* The live registry, and its three failures told apart. A registry we could
     not READ must not be reported as a bank that does not exist: the person
     would choose the same bank again and read the second refusal as us calling
     their bank fake. `lookupBank` never passes an unchecked code through. */
  const bank = await lookupBank(parsed.data.bankCode);
  if (!bank.ok) {
    if (bank.failure === "unreachable") return fail(SERVICE_DOWN_MESSAGE);
    if (bank.failure === "unconfigured") return fail(UNVERIFIABLE_MESSAGE);
    return fail("Choose a bank from the list.", { bankCode: "Choose a bank from the list." });
  }
  const bankName = bank.name;

  const resolved = await resolveBankAccountName(parsed.data);
  if (!resolved.ok) {
    if (resolved.failure === "not-confirmed") {
      return fail(NOT_CONFIRMED_MESSAGE, { accountNumber: "We could not confirm this account." });
    }
    if (resolved.failure === "unconfigured") return fail(UNVERIFIABLE_MESSAGE);
    return fail(SERVICE_DOWN_MESSAGE);
  }
  const accountName = resolved.accountName;

  /* Written by the service role, for the signed-in owner: a member's own
     client holds no INSERT on bank_accounts, so the bank's name, the time it
     answered and the processor's recipient can only ever come from here. */
  const writer = getAdminClient();
  if (!writer) return fail(NOT_CONFIGURED_MESSAGE);
  const { data: created, error } = await writer
    .from("bank_accounts")
    .insert({
      user_id: userId,
      bank_code: parsed.data.bankCode,
      bank_name: bankName,
      account_number: parsed.data.accountNumber,
      resolved_account_name: accountName,
      resolved_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !created) {
    const held = moneyHoldRefusal(error);
    if (held) return fail(held);
    /* SCUML item 15: the gate refused a lister; say nothing that would tip them off. */
    if (isEddGateRefusal(error)) return fail(eddGateMessage("member"));
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

  const account = toBankAccount(created);

  const admin = getAdminClient();
  if (admin) {
    /* ROOM BOOKINGS 1: a hotel owner is paid into this account's subaccount. */
    await ensureHostSubaccount(admin, userId, account.id);
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId },
      action: "payments.bank_account.added",
      reference: null,
      subjectUserId: userId,
      outcome: "added",
      /* The bank's code, never the account number. `audit_log` is readable by
         every admin, which is a wider audience than the server log, and a
         NUBAN is exactly the kind of datum rule 16 keeps out of both. */
      detail: { account_id: account.id, bank_code: account.bankCode },
    });
    await bankAccountAddedNotice(admin, userId, { bankName: account.bankName });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  return ok(account);
}

/* ---------------------------------------------------------- default, remove */

/**
 * Make one account the one money is sent to.
 *
 * THE DATABASE KEEPS IT SINGLE. `bank_accounts_single_default`, a
 * `BEFORE INSERT OR UPDATE` trigger running
 * `private.soft_deleting_single_default()`, demotes every other live row for
 * the same person in the same statement, and `bank_accounts_one_default_uq ON
 * (user_id) WHERE is_default AND deleted_at IS NULL` refuses a second default
 * if that trigger ever stops running. Both read off the live database on 22
 * September 2026. That is why this sets one flag and clears nothing.
 *
 * THIS IS THE LOUDEST NOTICE ON THE DESK. Changing the default payout account
 * is how a stolen session turns into stolen money, and it is the single
 * change on this platform a person most needs to hear about while it is still
 * reversible.
 */
export async function setDefaultBankAccount(id: string, stepUp?: string): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(bankAccountIdSchema, { id });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const limit = await guardMoney("setDefaultBankAccount", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const { data: account, error: readError } = await session.supabase
    .from("bank_accounts")
    .select("id, bank_name, bank_code, is_default")
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN_MESSAGE);
  if (!account) return fail(NOT_YOURS_MESSAGE);
  /* Already the default: nothing changed, so nothing is announced. A notice
     that says money now goes somewhere it already went is noise, and noise is
     how a person learns to swipe past the one that matters. */
  if (account.is_default) {
    revalidatePath("/settings");
    revalidatePath("/settings/payments");
    return ok(null);
  }
  /* V-81: this changes where money is paid out. */
  const defaultLock = await moneyLockRefusalFor(session.user.id, stepUp, { kind: "bank_default", target: account.id });
  if (defaultLock) return fail(defaultLock);

  const { error, count } = await session.supabase
    .from("bank_accounts")
    .update({ is_default: true }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null);
  if (error) return fail(SERVICE_DOWN_MESSAGE);
  if (count === 0) return fail(NOT_YOURS_MESSAGE);

  const admin = getAdminClient();
  if (admin) {
    await ensureHostSubaccount(admin, session.user.id, account.id);
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: "payments.bank_account.default_changed",
      reference: null,
      subjectUserId: session.user.id,
      outcome: "changed",
      detail: { account_id: account.id, bank_code: account.bank_code },
    });
    await bankDefaultChangedNotice(admin, session.user.id, { bankName: account.bank_name });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  return ok(null);
}

/**
 * Remove an account from the list. Soft: the database promotes a survivor.
 *
 * `bank_accounts_promote_default`, an `AFTER UPDATE` trigger running
 * `private.soft_deleting_promote_default()`, makes the newest remaining live
 * account the default when the one being removed was it. So removing the
 * account you were being paid into never leaves you with no payout account
 * while another one is sitting right there.
 *
 * A SECOND TAP IS NOT A SECOND REMOVAL: `is("deleted_at", null)` makes the
 * write idempotent by construction, and the second tap is told the account is
 * not on the list, which is the truth.
 */
export async function removeBankAccount(id: string, stepUp?: string): Promise<ActionResult<null>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(bankAccountIdSchema, { id });
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const limit = await guardMoney("removeBankAccount", session.user.id);
  if (!limit.allowed) return fail(limit.message);

  const { data: account, error: readError } = await session.supabase
    .from("bank_accounts")
    .select("id, bank_name, bank_code, is_default")
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) return fail(SERVICE_DOWN_MESSAGE);
  if (!account) return fail(NOT_YOURS_MESSAGE);
  /* V-81: removing the default promotes a survivor, which changes where money goes. */
  if (account.is_default) {
    const removeLock = await moneyLockRefusalFor(session.user.id, stepUp, { kind: "payout_remove", target: `bank:${account.id}` });
    if (removeLock) return fail(removeLock);
  }

  const { error, count } = await session.supabase
    .from("bank_accounts")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("user_id", session.user.id)
    .is("deleted_at", null);
  if (error) return fail(SERVICE_DOWN_MESSAGE);
  if (count === 0) return fail(NOT_YOURS_MESSAGE);

  const admin = getAdminClient();
  if (admin) {
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: "payments.bank_account.removed",
      reference: null,
      subjectUserId: session.user.id,
      outcome: "removed",
      detail: { account_id: account.id, bank_code: account.bank_code },
    });
    await bankAccountRemovedNotice(admin, session.user.id, { bankName: account.bank_name });
  }

  revalidatePath("/settings");
  revalidatePath("/settings/payments");
  return ok(null);
}

/* -------------------------------------------------------------------- list */

/** The caller's live accounts, default first, then oldest. */
/* B-2: read-only (or an exit the finish-setup hold never blocks), so it runs
   with the hold lifted. See lib/actions/setup-exempt.ts. */
export async function listBankAccounts(
  ...args: Parameters<typeof listBankAccountsInner>
): Promise<Awaited<ReturnType<typeof listBankAccountsInner>>> {
  return setupExempt(() => listBankAccountsInner(...args));
}

async function listBankAccountsInner(): Promise<ActionResult<BankAccount[]>> {
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
