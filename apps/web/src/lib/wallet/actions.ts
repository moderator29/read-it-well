"use server";

/**
 * Wallet server actions: the money core.
 *
 * Every action returns the shared ActionResult envelope, resolves the session
 * first, respects the "wallet" feature flag, and validates with the Zod
 * schemas in ./schema. Amounts arrive as naira text and become integer kobo
 * inside the schema, exactly once; beyond validation, money is integer kobo
 * only (Master Rule 50).
 *
 * The loop each action closes:
 *  - fundWallet starts a hosted Paystack checkout under an rm-fund reference;
 *    the webhook (or the verify-on-redirect fallback) posts the COMPLETED
 *    deposit, idempotent on that reference.
 *  - withdraw posts a PENDING debit hold, then initiates a Paystack transfer
 *    under the same rm-wd reference; the webhook settles it to COMPLETED,
 *    FAILED or REVERSED.
 *  - transferToUser writes both ledger legs (rm-p2p-<uuid>-out / -in) as
 *    COMPLETED, reversing the first if the second cannot land.
 *
 * Completion notifications fire from the database trigger, never from here.
 *
 * Email is the one thing this file does after the ledger, never instead of it:
 * a credited funding and a withdrawal that has been marked FAILED each send
 * one message through bestEffortEmail, which does nothing without
 * RESEND_API_KEY and swallows every failure. No email can move money, and no
 * email failure can change what the ledger says or what the caller is told.
 */

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { formatMoney } from "@naijafinds/i18n";
import {
  fail,
  formDataToObject,
  ok,
  validate,
  type ActionResult,
} from "../actions/envelope";
import {
  NOT_CONFIGURED_MESSAGE,
  SIGNED_OUT_MESSAGE,
  resolveSession,
} from "../actions/session";
import { bestEffortEmail, sendMessage } from "../email/client";
import { walletFunded, withdrawalFailed } from "../email/messages";
import { contactForSelf, contactForUser } from "../email/recipients";
import { isFeatureEnabled } from "../flags";
import { logMoney } from "../payments/observability";
import {
  PaystackError,
  createTransferRecipient,
  initializeTransaction,
  initiateTransfer,
  isPaystackConfigured,
  resolveAccountNumber,
  verifyTransaction,
} from "../payments/paystack";
import { FUND_PREFIX, P2P_PREFIX, WITHDRAW_PREFIX } from "../payments/references";
import { bankByCode } from "./banks";
import { recordMoneyAudit } from "./audit";
import {
  availableBalanceMinor,
  displayNameFor,
  ensureWalletId,
  findUserByEmail,
  getAdminClient,
  postEntry,
  recordFunding,
  setEntryStatus,
  type AdminClient,
} from "./ledger";
import { callMoneyRpc, readMoneyStatus } from "./rpc";
import { readStatement } from "./repository";
import {
  fundReferenceSchema,
  fundSchema,
  transferSchema,
  withdrawSchema,
} from "./schema";
import type { WalletSummary } from "./types";

const WALLET_OFF_MESSAGE =
  "The wallet is switched off for a moment while we make improvements. Please try again shortly.";
const FUNDING_UNCONFIGURED_MESSAGE =
  "Wallet funding switches on the moment payment keys land. Your balance is untouched and nothing was charged.";
/**
 * A reference that does not resolve is the one wallet error where the reader's
 * real fear is "has my money gone", so the copy answers that first and gives
 * them the one route that can trace it.
 */
const UNKNOWN_REFERENCE_MESSAGE =
  "That payment reference is not recognised. Open your wallet and start the funding again. If money has already left your account, contact support and we will trace it.";

/** Kobo-exact naira for messages: whole naira via formatMoney, kobo appended. */
function nairaExact(minor: number): string {
  const abs = Math.abs(minor);
  const kobo = abs % 100;
  const whole = formatMoney(abs - kobo);
  return kobo === 0 ? whole : `${whole}.${String(kobo).padStart(2, "0")}`;
}

/**
 * The balance the wallet screen shows, read for email copy: the derived
 * balance from wallet_balances, so the figure in the inbox and the figure on
 * screen are the same number. Zero when the wallet has no rows yet.
 */
async function shownBalanceMinor(admin: AdminClient, userId: string): Promise<number> {
  const { data } = await admin
    .from("wallet_balances")
    .select("balance_minor")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.balance_minor ?? 0;
}

/** Where callbacks land: explicit site URL first, else the request's origin. */
async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (explicit.length > 0) return explicit.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** Turn a Paystack failure into honest copy, keeping its useful detail. */
function describePaystackError(e: unknown, fallback: string): string {
  if (e instanceof PaystackError && e.status !== 401 && e.message.trim().length > 0) {
    return `${fallback} The payment service said: ${e.message.trim()}`;
  }
  return fallback;
}

/* ------------------------------------------------------------------- fund */

export type FundStart = {
  authorizationUrl: string;
  reference: string;
};

/**
 * Start funding the wallet. Validates the naira amount, generates the
 * rm-fund-<uuid> reference, and opens a hosted Paystack checkout that calls
 * back to /wallet?funded=1. The ledger is written only when the charge
 * succeeds, by the webhook or the verify fallback, never here.
 */
export async function fundWallet(
  _prev: ActionResult<FundStart | null>,
  formData: FormData,
): Promise<ActionResult<FundStart | null>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF_MESSAGE);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(fundSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  if (!isPaystackConfigured()) return fail(FUNDING_UNCONFIGURED_MESSAGE);

  /*
   * NO CHECKOUT WITHOUT A WAY TO ACCOUNT FOR IT.
   *
   * This is the defect that left a real payment unrecorded for seventeen hours,
   * and the shape of it is worth stating exactly because it recurs otherwise.
   *
   * The service role client was resolved LATER, after the charge had been
   * opened, and it was consulted as `if (admin) { record the audit }`. So with
   * that key absent, every one of these happened quietly and in order:
   *
   *   - the Paystack checkout opened, because that needs only the Paystack key;
   *   - the person paid;
   *   - the audit row was skipped, with no error and no log line;
   *   - and the WEBHOOK, which is what credits the wallet, needs the same key,
   *     so it could not post the ledger entry either.
   *
   * That is the worst outcome a money surface has. The charge succeeds, nothing
   * on our side records it was ever started, and the only trace is at the
   * processor. It was found by asking Paystack rather than by reading our own
   * data, because there was no data of ours to read.
   *
   * `if (admin)` is what made it silent. An optional audit is defensible where
   * the audit is a nicety; on the call that OPENS A CHARGE it is the difference
   * between a recoverable payment and a lost one. So the check moves ahead of
   * the money and it refuses rather than degrades: if we cannot write down that
   * this started, we do not start it.
   *
   * Nothing is charged at this point, so the reader gets one plain sentence and
   * no instructions, because there is nothing for them to do but come back.
   */
  const admin = getAdminClient();
  if (!admin) {
    logMoney({
      surface: "fund",
      outcome: "unconfigured",
      reason: "service_role_key_missing",
      userId: session.user.id,
    });
    return fail(
      "Funding is unavailable just now, so nothing was charged. This is our side, not yours, and it is already flagged. Please try again shortly.",
    );
  }

  const email = session.user.email;
  if (!email) {
    return fail(
      "Your account has no email address, which funding needs. Add one to your profile and try again.",
    );
  }

  const reference = `${FUND_PREFIX}${randomUUID()}`;
  const callbackUrl = `${await siteOrigin()}/wallet?funded=1&reference=${reference}`;

  try {
    const tx = await initializeTransaction({
      email,
      amountMinor: parsed.data.amount,
      reference,
      callbackUrl,
      metadata: { user_id: session.user.id, purpose: "wallet_fund" },
    });
    // The intent, recorded before the money moves. Without this line a charge
    // that never reaches the ledger has no record on our side that it was ever
    // started, and reconciliation has only Paystack's word to work from.
    logMoney({
      surface: "fund",
      outcome: "received",
      reason: "checkout_opened",
      reference,
      amountMinor: parsed.data.amount,
      userId: session.user.id,
    });
    /* Unconditional. The client was resolved and REFUSED ON above, before the
       charge was opened, so by the time execution is here it exists and the
       intent is always written down. That is the whole of the fix: the audit
       is no longer something that happens if the environment feels like it. */
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: "wallet.funding.started",
      reference,
      amountMinor: parsed.data.amount,
      subjectUserId: session.user.id,
      outcome: "started",
    });
    return ok({ authorizationUrl: tx.authorizationUrl, reference: tx.reference });
  } catch (e) {
    logMoney({
      surface: "fund",
      outcome: "failed",
      reason: "checkout_could_not_open",
      reference,
      amountMinor: parsed.data.amount,
      userId: session.user.id,
    });
    return fail(
      describePaystackError(
        e,
        "The secure payment page could not be opened. Nothing was charged.",
      ),
    );
  }
}

/* --------------------------------------------------------------- withdraw */

export type WithdrawReceipt = {
  amountMinor: number;
  reference: string;
  bankName: string;
  accountLast4: string;
};

/**
 * Withdraw to a Nigerian bank account.
 *
 * The hold and the balance check happen together, under a row lock on the
 * owner's wallet, inside public.hold_wallet_withdrawal. They used to be two
 * PostgREST round trips with nothing between them, which is the same gap
 * transferToUser had: two concurrent withdrawals both read the same balance,
 * both found it sufficient, and both posted a hold. private.pay_booking_from_wallet
 * shows the shape this has to take and hold_wallet_withdrawal is the withdrawal
 * equivalent, requested from Agent B and specified in lib/wallet/rpc.ts.
 *
 * Once the hold exists, the same rm-wd-<uuid> reference is handed to Paystack
 * as a transfer. The webhook settles the entry; if the transfer cannot start,
 * the hold is marked FAILED and the balance is untouched; and if neither ever
 * happens, sweepStaleWithdrawalHolds asks Paystack what became of it and
 * releases the money rather than holding it forever.
 */
export async function withdraw(
  _prev: ActionResult<WithdrawReceipt | null>,
  formData: FormData,
): Promise<ActionResult<WithdrawReceipt | null>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF_MESSAGE);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(withdrawSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  if (!isPaystackConfigured()) {
    return fail("Withdrawals switch on the moment payment keys land. Your balance is untouched.");
  }
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const bank = bankByCode(parsed.data.bankCode);
  if (!bank) return fail("Choose a bank from the list.", { bankCode: "Choose a bank from the list." });

  /*
   * WHO THE MONEY IS GOING TO, ASKED OF THE BANK, BEFORE ANYTHING IS HELD.
   *
   * This used to arrive as a form field the person filled in themselves, so
   * the name on a payout instruction was whatever they had typed - unchecked
   * against the account it named. The resolution lived in `requestWithdrawal`,
   * a wrapper whose only caller was a wallet panel nothing rendered, so the
   * live sheet posted here directly and skipped it entirely.
   *
   * It is in `withdraw` now, which is the function that moves the money, so
   * there is no path to a payout that has not been through it.
   *
   * BEFORE THE HOLD, deliberately. A failure here has taken nothing and locked
   * nothing; resolving after the hold would leave a typo holding somebody's
   * balance until it expired.
   */
  let accountName: string;
  try {
    const resolved = await resolveAccountNumber(parsed.data.accountNumber, bank.code);
    accountName = resolved.accountName;
  } catch (error) {
    logMoney({ surface: "withdraw", outcome: "rejected", reason: "account_not_resolved" });
    return fail(
      describePaystackError(
        error,
        "We could not find that account at the bank you chose. Check the number and the bank, and nothing has been sent.",
      ),
      {
        accountNumber:
          "We could not find that account at the bank you chose. Nothing has been sent.",
      },
    );
  }

  const amountMinor = parsed.data.amount;
  const accountLast4 = parsed.data.accountNumber.slice(-4);
  const reference = `${WITHDRAW_PREFIX}${randomUUID()}`;

  /*
   * The hold's metadata. The account NUMBER never goes in: the last four digits
   * are what a receipt needs and what the settlement email prints, and the full
   * NUBAN belongs to Paystack's recipient record, not to a row every admin can
   * read.
   */
  const holdMetadata = {
    note: `Withdrawal to ${bank.name} ****${accountLast4}`,
    bank_code: bank.code,
    bank_name: bank.name,
    account_last4: accountLast4,
    account_name: accountName,
  };

  const held = await callMoneyRpc(
    admin,
    "withdraw",
    "hold_wallet_withdrawal",
    {
      owner_user: session.user.id,
      amount: amountMinor,
      hold_reference: reference,
      hold_metadata: holdMetadata,
    },
    { reference, amountMinor, userId: session.user.id },
  );

  if (held.outcome === "failed") {
    return fail("The withdrawal could not be recorded. Your balance is untouched. Please try again.");
  }

  if (held.outcome === "ok") {
    const status = readMoneyStatus(held.data);
    if (status.status === "insufficient") {
      const available = status.availableMinor ?? 0;
      logMoney({
        surface: "withdraw",
        outcome: "rejected",
        reason: "insufficient_balance",
        reference,
        amountMinor,
        userId: session.user.id,
      });
      return fail(
        `Your available balance is ${nairaExact(available)}, so this withdrawal of ${nairaExact(amountMinor)} cannot go through.`,
        { amount: "There is not enough in your wallet for this amount." },
      );
    }
    if (status.status !== "ok" && status.status !== "duplicate") {
      logMoney({
        surface: "withdraw",
        outcome: "rejected",
        reason: `rpc_status:${status.status}`,
        reference,
        amountMinor,
        userId: session.user.id,
      });
      return fail(
        "The withdrawal could not be recorded. Your balance is untouched. Please try again.",
      );
    }
    logMoney({
      surface: "withdraw",
      outcome: "posted",
      reason: "hold_placed",
      reference,
      amountMinor,
      userId: session.user.id,
      ...(status.walletId ? { walletId: status.walletId } : {}),
    });
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: "wallet.withdrawal.hold_placed",
      reference,
      amountMinor,
      subjectUserId: session.user.id,
      walletId: status.walletId,
      outcome: status.status,
      detail: { bank_code: bank.code, account_last4: accountLast4, atomic: true },
    });
  } else {
    /*
     * THE FALLBACK. See the identical note in transferToUser: the public
     * wrapper is not applied yet, and refusing every withdrawal would be a
     * worse answer than running the path that already shipped. It says so on
     * the money channel every time, and it goes the day
     * public.hold_wallet_withdrawal lands.
     */
    logMoney({
      surface: "withdraw",
      outcome: "unconfigured",
      reason: "atomic_hold_unavailable_using_unlocked_path",
      reference,
      amountMinor,
      userId: session.user.id,
    });
    try {
      const walletId = await ensureWalletId(admin, session.user.id);
      const available = await availableBalanceMinor(admin, walletId);
      if (amountMinor > available) {
        return fail(
          `Your available balance is ${nairaExact(available)}, so this withdrawal of ${nairaExact(amountMinor)} cannot go through.`,
          { amount: "There is not enough in your wallet for this amount." },
        );
      }

      await postEntry(admin, {
        walletId,
        kind: "withdrawal",
        direction: "debit",
        amountMinor,
        reference,
        status: "PENDING",
        metadata: holdMetadata,
      });

      await recordMoneyAudit(admin, {
        actor: { kind: "user", userId: session.user.id },
        action: "wallet.withdrawal.hold_placed",
        reference,
        amountMinor,
        subjectUserId: session.user.id,
        walletId,
        outcome: "posted",
        detail: { bank_code: bank.code, account_last4: accountLast4, atomic: false },
      });
    } catch {
      return fail(
        "The withdrawal could not be recorded. Your balance is untouched. Please try again.",
      );
    }
  }

  try {
    const recipient = await createTransferRecipient({
      /* The bank's own answer, resolved above. This read a form field until
         now, so the name on the Paystack recipient record was whatever the
         person had typed rather than who the account belongs to. */
      name: accountName,
      accountNumber: parsed.data.accountNumber,
      bankCode: bank.code,
    });
    await initiateTransfer({
      amountMinor,
      recipientCode: recipient.recipientCode,
      reference,
      reason: "RentMe wallet withdrawal",
    });
  } catch (e) {
    let markedFailed = false;
    try {
      await setEntryStatus(admin, reference, "FAILED", {
        failure: e instanceof PaystackError ? e.message : "Transfer initiation failed.",
      });
      markedFailed = true;
    } catch {
      // The hold stays PENDING. sweepStaleWithdrawalHolds asks Paystack what
      // became of this reference and, finding no transfer under it, releases
      // the hold. That is the path that used to end in a balance held forever.
    }

    logMoney({
      surface: "withdraw",
      outcome: markedFailed ? "rejected" : "failed",
      reason: markedFailed ? "transfer_not_started_hold_released" : "transfer_not_started_hold_stuck",
      reference,
      amountMinor,
      userId: session.user.id,
    });
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: "wallet.withdrawal.not_started",
      reference,
      amountMinor,
      subjectUserId: session.user.id,
      outcome: markedFailed ? "FAILED" : "still_pending",
      detail: { bank_code: bank.code, account_last4: accountLast4 },
    });

    // Only once the hold is genuinely FAILED is it true to say the money is
    // back in the wallet, so only then does the email go.
    if (markedFailed) {
      await bestEffortEmail(async () => {
        const owner = await contactForSelf(session.supabase, session.user, "wallet");
        if (!owner) return;
        const message = withdrawalFailed({
          ownerName: owner.name,
          amountMinor,
          bankName: bank.name,
          accountLast4,
        });
        await sendMessage(owner.email, message);
      });
    }

    return fail(
      describePaystackError(
        e,
        "The withdrawal could not be started, so it was cancelled and your balance is untouched.",
      ),
    );
  }

  revalidatePath("/wallet");
  return ok({ amountMinor, reference, bankName: bank.name, accountLast4 });
}

/* ------------------------------------------------------------------- p2p */

export type TransferReceipt = {
  amountMinor: number;
  reference: string;
  recipientName: string;
};

/**
 * Transfer wallet money to another RentMe user by email.
 *
 * BOTH LEGS, ONE TRANSACTION, ONE ROW LOCK. This used to read
 * availableBalanceMinor and then post two entries in separate PostgREST round
 * trips, with no transaction and no lock between the check and the writes. Two
 * concurrent transfers both read the same balance, both found it sufficient,
 * and both posted: a wallet holding NGN 5,000 could send NGN 5,000 twice and
 * end up at minus NGN 5,000. That is not an exotic race. It is two taps on a
 * slow connection, and private.wallets_overdrawn() exists precisely because
 * somebody expected it to happen.
 *
 * private.transfer_between_wallets has done this correctly the whole time. It
 * locks the sender's wallet with SELECT FOR UPDATE, computes settled minus
 * pending debits inside that lock, writes both legs in ONE insert statement so
 * neither can land without the other, and treats a unique_violation on either
 * reference as a duplicate rather than as a second payment. Nothing had ever
 * called it. This calls it.
 */
export async function transferToUser(
  _prev: ActionResult<TransferReceipt | null>,
  formData: FormData,
): Promise<ActionResult<TransferReceipt | null>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF_MESSAGE);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsed = validate(transferSchema, formDataToObject(formData));
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  const recipient = await findUserByEmail(parsed.data.recipientEmail);
  if (!recipient) {
    return fail(
      "No RentMe account uses that email address yet. Check the spelling, or ask them to sign up for RentMe and send it once they have.",
      {
        recipientEmail:
          "No account uses this address. Check the spelling, or ask them to sign up first.",
      },
    );
  }
  if (recipient.id === session.user.id) {
    return fail("You cannot transfer to your own wallet. Enter the recipient's email address.", {
      recipientEmail: "Enter the recipient's email address, not your own.",
    });
  }

  const amountMinor = parsed.data.amount;
  const pairId = randomUUID();
  const outReference = `${P2P_PREFIX}${pairId}-out`;
  const inReference = `${P2P_PREFIX}${pairId}-in`;

  // Display names only. Read before the movement so the receipt can name the
  // recipient, and never allowed to decide whether money moves.
  let senderName = session.user.email ?? "A RentMe user";
  let recipientName = parsed.data.recipientEmail;
  try {
    senderName = (await displayNameFor(admin, session.user.id)) ?? senderName;
    recipientName = (await displayNameFor(admin, recipient.id)) ?? recipientName;
  } catch {
    // A missing display name is not a reason to refuse a transfer.
  }

  const call = await callMoneyRpc(
    admin,
    "transfer",
    "transfer_between_wallets",
    {
      sender_user: session.user.id,
      recipient_user: recipient.id,
      amount: amountMinor,
      out_reference: outReference,
      in_reference: inReference,
      note: parsed.data.note ?? null,
    },
    { reference: outReference, amountMinor, userId: session.user.id },
  );

  if (call.outcome === "failed") {
    return fail("The transfer could not be completed. Your balance is untouched. Please try again.");
  }

  if (call.outcome === "ok") {
    const status = readMoneyStatus(call.data).status;

    if (status === "insufficient") {
      // Read the figure only to say it. The refusal was already decided under
      // the lock, by the database, on the balance as it was at that instant.
      let available = 0;
      try {
        available = await availableBalanceMinor(admin, await ensureWalletId(admin, session.user.id));
      } catch {
        // Fall through with zero rather than turn a clean refusal into an error.
      }
      logMoney({
        surface: "transfer",
        outcome: "rejected",
        reason: "insufficient_balance",
        reference: outReference,
        amountMinor,
        userId: session.user.id,
      });
      return fail(
        `Your available balance is ${nairaExact(available)}, so this transfer of ${nairaExact(amountMinor)} cannot go through.`,
        { amount: "There is not enough in your wallet for this amount." },
      );
    }

    if (status !== "ok" && status !== "duplicate") {
      logMoney({
        surface: "transfer",
        outcome: "rejected",
        reason: `rpc_status:${status}`,
        reference: outReference,
        amountMinor,
        userId: session.user.id,
      });
      return fail(
        "The transfer could not be completed. Your balance is untouched. Please try again.",
      );
    }

    logMoney({
      surface: "transfer",
      outcome: status === "ok" ? "posted" : "duplicate",
      reason: status === "ok" ? "both_legs_posted" : "already_posted",
      reference: outReference,
      amountMinor,
      userId: session.user.id,
    });
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: "wallet.transfer.posted",
      reference: outReference,
      amountMinor,
      subjectUserId: session.user.id,
      outcome: status,
      detail: { counterparty_user_id: recipient.id, in_reference: inReference, atomic: true },
    });

    // Display text only, and best effort. The database function writes the
    // counterparty and the sender's message; the statement's human-readable
    // note is ours to add and no balance depends on it, so a failure here can
    // never unmake a transfer that has already committed.
    await labelTransferLegs(admin, {
      outReference,
      inReference,
      outNote: `Transfer to ${recipientName}`,
      inNote: `Transfer from ${senderName}`,
    });

    revalidatePath("/wallet");
    return ok({ amountMinor, reference: `${P2P_PREFIX}${pairId}`, recipientName });
  }

  /*
   * NO FALLBACK ANY MORE, AND THAT IS THE POINT.
   *
   * There used to be one here: if the public wrapper was absent, this ran the
   * old path that read the balance and then posted two ledger rows in separate
   * round trips. Two concurrent transfers both passed the check and both
   * posted. It was kept deliberately and temporarily, with a loud log line,
   * because refusing every transfer would have been worse than continuing to
   * run what already shipped.
   *
   * public.transfer_between_wallets is applied now, so the wrapper cannot be
   * missing, and the block is gone rather than left unreachable. An unlocked
   * money path that nothing can currently reach is still an unlocked money
   * path sitting in the file waiting for somebody to call it.
   *
   * Anything other than "ok" or "duplicate" above has already returned. This
   * is the genuinely unexpected case: the function exists and answered with
   * something the contract does not list.
   */
  logMoney({
    surface: "transfer",
    outcome: "failed",
    reason: `transfer_rpc_missing:${call.outcome}`,
    reference: outReference,
    amountMinor,
    userId: session.user.id,
  });

  return fail(
    "The transfer could not be completed. Your balance is untouched. Please try again.",
  );
}

/**
 * Put a human-readable note on both legs of a completed transfer.
 *
 * The statement screen renders metadata.note, and the database function writes
 * the counterparty id and the sender's own message but not that display line.
 * Adding it afterwards is a display-only write against two unique references:
 * it moves no money, it cannot fail a transfer, and running it twice sets the
 * same two strings. Every failure is swallowed for exactly that reason.
 */
async function labelTransferLegs(
  admin: AdminClient,
  legs: { outReference: string; inReference: string; outNote: string; inNote: string },
): Promise<void> {
  try {
    await setEntryStatus(admin, legs.outReference, "COMPLETED", { note: legs.outNote });
    await setEntryStatus(admin, legs.inReference, "COMPLETED", { note: legs.inNote });
  } catch {
    // A statement row without its caption is a cosmetic problem. See above.
  }
}

/* ------------------------------------------------------------ verify fund */

export type FundingVerification = {
  credited: boolean;
  amountMinor: number;
};

/**
 * The verify fallback for the redirect race: when the user lands back on
 * /wallet?funded=1 before the webhook arrives, this checks the transaction
 * with Paystack and credits the ledger idempotently, the same write the
 * webhook performs. Whichever runs second is a clean duplicate.
 */
export async function verifyFunding(
  reference: string,
): Promise<ActionResult<FundingVerification | null>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF_MESSAGE);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  const parsedReference = fundReferenceSchema.safeParse(reference);
  if (!parsedReference.success) return fail(UNKNOWN_REFERENCE_MESSAGE);

  if (!isPaystackConfigured()) return fail(FUNDING_UNCONFIGURED_MESSAGE);
  const admin = getAdminClient();
  if (!admin) return fail(NOT_CONFIGURED_MESSAGE);

  let tx;
  try {
    tx = await verifyTransaction(parsedReference.data);
  } catch {
    return fail(
      "The payment could not be checked just now. If you completed it, your balance updates automatically in a moment.",
    );
  }

  if (tx.status !== "success") {
    if (tx.status === "abandoned") {
      return fail("The payment was not completed, so nothing was charged.");
    }
    if (tx.status === "failed") {
      return fail("The payment did not go through, so nothing was credited.");
    }
    if (tx.status === "reversed") {
      return fail(
        "The payment was reversed by the processor, so it was not credited. Your balance is untouched.",
      );
    }
    return fail("The payment is still processing. Your wallet updates the moment it settles.");
  }

  if (tx.currency !== "NGN") {
    return fail(
      "That payment was not in naira, so it was not credited. Contact support with the reference and we will trace it for you.",
    );
  }

  const metadataUserId = tx.metadata["user_id"];
  const ownerId =
    typeof metadataUserId === "string" && metadataUserId.length > 0
      ? metadataUserId
      : tx.customerEmail && tx.customerEmail.toLowerCase() === (session.user.email ?? "").toLowerCase()
        ? session.user.id
        : null;
  if (!ownerId) {
    return fail("This payment could not be matched to a wallet. Our team reconciles it automatically.");
  }

  // "posted" means this call wrote the credit; "duplicate" means the webhook
  // got there first. The receipt email follows the write, so only a posted
  // credit sends one and a redirect racing its webhook cannot email twice.
  let posted: "posted" | "duplicate" = "duplicate";
  try {
    posted = await recordFunding(admin, {
      userId: ownerId,
      amountMinor: tx.amountMinor,
      reference: parsedReference.data,
      metadata: {
        channel: tx.channel,
        paid_at: tx.paidAt,
        purpose: "wallet_fund",
      },
    });
    logMoney({
      surface: "verify",
      outcome: posted === "posted" ? "posted" : "duplicate",
      reason: posted === "posted" ? "credited_on_redirect" : "webhook_got_there_first",
      reference: parsedReference.data,
      amountMinor: tx.amountMinor,
      userId: ownerId,
    });
    await recordMoneyAudit(admin, {
      actor: { kind: "user", userId: session.user.id },
      action: posted === "posted" ? "wallet.funding.posted" : "wallet.funding.duplicate",
      reference: parsedReference.data,
      amountMinor: tx.amountMinor,
      subjectUserId: ownerId,
      outcome: posted,
      detail: { source: "verify_on_redirect", channel: tx.channel },
    });
  } catch {
    logMoney({
      surface: "verify",
      outcome: "failed",
      reason: "post_failed",
      reference: parsedReference.data,
      amountMinor: tx.amountMinor,
      userId: ownerId,
    });
    return fail(
      "The payment succeeded but could not be recorded just now. Your balance updates automatically in a moment.",
    );
  }

  // The credit is in the ledger. Receipting it by email is best effort. The
  // owner is usually the signed-in user, whose address comes from their
  // session; when the payment metadata names someone else, that address is
  // read through the service role, never taken from the request.
  await bestEffortEmail(async () => {
    if (posted !== "posted") return;
    const owner =
      ownerId === session.user.id
        ? await contactForSelf(session.supabase, session.user, "wallet")
        : await contactForUser(admin, ownerId, "wallet");
    if (!owner) return;
    const message = walletFunded({
      ownerName: owner.name,
      amountMinor: tx.amountMinor,
      balanceMinor: await shownBalanceMinor(admin, ownerId),
    });
    await sendMessage(owner.email, message);
  });

  revalidatePath("/wallet");
  return ok({ credited: true, amountMinor: tx.amountMinor });
}

/* -------------------------------------------------------------- statement */

/**
 * The signed-in user's statement: derived balance plus the newest hundred
 * entries, read under RLS. Used by the page and by success states that
 * re-read the ledger after a movement.
 */
export async function getStatement(): Promise<ActionResult<WalletSummary | null>> {
  if (!(await isFeatureEnabled("wallet"))) return fail(WALLET_OFF_MESSAGE);

  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);

  try {
    return ok(await readStatement(session.supabase, session.user.id));
  } catch {
    return fail("Your statement could not be loaded just now. Please try again shortly.");
  }
}

/* ------------------------------------------------ the account name lookup */

/*
 * A block of "legacy form signatures" used to sit here: `requestDeposit`,
 * `requestWithdrawal` and `requestTransfer`, plus a result type and a field
 * name translator, all of it wrapping the real actions above for one older
 * wallet panel.
 *
 * That panel was imported by nothing. The live wallet posts straight to
 * `fundWallet`, `withdraw` and `transferToUser`, so the wrappers were a second
 * set of money entry points that no screen could reach - and the one piece of
 * correctness that lived only in a wrapper, resolving the destination account
 * name with the bank, was therefore skipped by the form people actually use.
 * That resolution is inside `withdraw` now, where the money moves.
 *
 * Deleted rather than kept for safety. Two ways into a payout is how one of
 * them goes unmaintained, and this is which one it was.
 */

/**
 * Who owns this account, asked while the reader can still act on the answer.
 *
 * THE SAME CALL THE WITHDRAWAL ITSELF MAKES, moved one step earlier.
 * `withdraw` resolves the name and refuses on a mismatch, which is correct and
 * is also the worst moment to find out you typed a digit wrong: the
 * sheet is full, the amount is entered, and the feedback arrives as a
 * rejection. Here it arrives as a name appearing under the field.
 *
 * NOTHING FROM HERE IS TRUSTED. This is a convenience read for the form, and
 * the withdrawal resolves the account again on its own rather than accepting
 * whatever comes back from the browser. A name that reached the client could be
 * edited there; the one that goes into the payout instruction never leaves the
 * server.
 *
 * IT RETURNS FAILURE AS A VALUE rather than throwing. A half-typed account
 * number is the normal state of this field, not an error somebody has made, so
 * the empty `reason` cases are silent by design and only a complete pair that
 * genuinely does not resolve says anything.
 */
export async function lookupAccountName(
  bankCode: string,
  accountNumber: string,
): Promise<{ ok: true; accountName: string } | { ok: false; reason: string }> {
  const session = await resolveSession();
  if (session.state !== "signed-in") return { ok: false, reason: "" };
  if (!isPaystackConfigured()) return { ok: false, reason: "" };

  /* Keyed on the CODE, which is what every caller actually holds: the select on
     the withdraw sheet posts `bankCode`, and `withdraw` resolves by code too.
     It took a display name until now, and its only caller was a wallet panel
     that nothing rendered. */
  const bank = bankByCode(bankCode.trim());
  if (!bank) return { ok: false, reason: "" };

  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length !== 10) return { ok: false, reason: "" };

  try {
    const resolved = await resolveAccountNumber(digits, bank.code);
    return { ok: true, accountName: resolved.accountName };
  } catch {
    /* Deliberately not the processor's wording. The reader is still filling the
       form and the only useful thing to say is that this pair does not match;
       the withdrawal gives the full message if they go on anyway. */
    return { ok: false, reason: "No account found with that number at this bank." };
  }
}
