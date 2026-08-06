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
import { redirect } from "next/navigation";
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
import { bestEffortEmail, sendEmail } from "../email/client";
import { walletFunded, withdrawalFailed } from "../email/messages";
import { contactForSelf, contactForUser } from "../email/recipients";
import { isFeatureEnabled } from "../flags";
import {
  PaystackError,
  createTransferRecipient,
  initializeTransaction,
  initiateTransfer,
  isPaystackConfigured,
  verifyTransaction,
} from "../payments/paystack";
import { bankByCode, bankByName } from "./banks";
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

  const email = session.user.email;
  if (!email) {
    return fail(
      "Your account has no email address, which funding needs. Add one to your profile and try again.",
    );
  }

  const reference = `rm-fund-${randomUUID()}`;
  const callbackUrl = `${await siteOrigin()}/wallet?funded=1&reference=${reference}`;

  try {
    const tx = await initializeTransaction({
      email,
      amountMinor: parsed.data.amount,
      reference,
      callbackUrl,
      metadata: { user_id: session.user.id, purpose: "wallet_fund" },
    });
    return ok({ authorizationUrl: tx.authorizationUrl, reference: tx.reference });
  } catch (e) {
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
 * Withdraw to a Nigerian bank account. Checks the spendable balance (derived
 * balance minus pending debits) server-side, posts a PENDING debit hold under
 * rm-wd-<uuid>, then initiates the Paystack transfer with that same
 * reference. The webhook settles the entry; if the transfer cannot start, the
 * hold is marked FAILED and the balance is untouched.
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

  const amountMinor = parsed.data.amount;
  const accountLast4 = parsed.data.accountNumber.slice(-4);
  const reference = `rm-wd-${randomUUID()}`;

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
      metadata: {
        note: `Withdrawal to ${bank.name} ****${accountLast4}`,
        bank_code: bank.code,
        bank_name: bank.name,
        account_last4: accountLast4,
        account_name: parsed.data.accountName,
      },
    });
  } catch {
    return fail("The withdrawal could not be recorded. Your balance is untouched. Please try again.");
  }

  try {
    const recipient = await createTransferRecipient({
      name: parsed.data.accountName,
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
      // The hold stays PENDING; reconciliation settles it against Paystack.
    }

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
        await sendEmail({ to: owner.email, subject: message.subject, html: message.html });
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
 * Transfer wallet money to another RentMe user by email. Writes both ledger
 * legs with paired references (rm-p2p-<uuid>-out and -in), both COMPLETED;
 * if the recipient leg cannot land, the sender leg is marked REVERSED.
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
  const outReference = `rm-p2p-${pairId}-out`;
  const inReference = `rm-p2p-${pairId}-in`;

  try {
    const senderWalletId = await ensureWalletId(admin, session.user.id);
    const available = await availableBalanceMinor(admin, senderWalletId);
    if (amountMinor > available) {
      return fail(
        `Your available balance is ${nairaExact(available)}, so this transfer of ${nairaExact(amountMinor)} cannot go through.`,
        { amount: "There is not enough in your wallet for this amount." },
      );
    }

    const recipientWalletId = await ensureWalletId(admin, recipient.id);
    const senderName =
      (await displayNameFor(admin, session.user.id)) ?? session.user.email ?? "A RentMe user";
    const recipientName =
      (await displayNameFor(admin, recipient.id)) ?? parsed.data.recipientEmail;

    await postEntry(admin, {
      walletId: senderWalletId,
      kind: "transfer_out",
      direction: "debit",
      amountMinor,
      reference: outReference,
      status: "COMPLETED",
      metadata: {
        note: `Transfer to ${recipientName}`,
        counterparty_user_id: recipient.id,
        ...(parsed.data.note ? { message: parsed.data.note } : {}),
      },
    });

    try {
      await postEntry(admin, {
        walletId: recipientWalletId,
        kind: "transfer_in",
        direction: "credit",
        amountMinor,
        reference: inReference,
        status: "COMPLETED",
        metadata: {
          note: `Transfer from ${senderName}`,
          counterparty_user_id: session.user.id,
          ...(parsed.data.note ? { message: parsed.data.note } : {}),
        },
      });
    } catch {
      await setEntryStatus(admin, outReference, "REVERSED", {
        reversal_reason: "The recipient leg could not be recorded.",
      });
      return fail(
        "The transfer could not reach the recipient, so it was reversed. Your balance is untouched.",
      );
    }

    revalidatePath("/wallet");
    return ok({ amountMinor, reference: `rm-p2p-${pairId}`, recipientName });
  } catch {
    return fail("The transfer could not be completed. Your balance is untouched. Please try again.");
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
  } catch {
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
    await sendEmail({ to: owner.email, subject: message.subject, html: message.html });
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

/* ------------------------------------------------- legacy form signatures */

/**
 * The original wallet action deck posts to the three actions below. They now
 * delegate to the real flows above, translating between the legacy result
 * shape and the ActionResult envelope so the older component keeps working
 * without modification.
 */

export type WalletActionField = "amount" | "bankName" | "accountNumber" | "recipient";

export type WalletActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<WalletActionField, string>>;
  /** The validated amount in integer kobo, echoed back for display. */
  amountMinor?: number;
};

const EMPTY_ENVELOPE = { ok: false, error: "" } as const;

function legacyFieldErrors(
  fieldErrors: Record<string, string> | undefined,
  map: Partial<Record<string, WalletActionField>>,
): Partial<Record<WalletActionField, string>> | undefined {
  if (!fieldErrors) return undefined;
  const out: Partial<Record<WalletActionField, string>> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    const target = map[key];
    if (target && !(target in out)) out[target] = message;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function requestDeposit(
  _prev: WalletActionResult,
  formData: FormData,
): Promise<WalletActionResult> {
  const result = await fundWallet(EMPTY_ENVELOPE, formData);
  if (result.ok && result.data) redirect(result.data.authorizationUrl);
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message: result.error || undefined,
    fieldErrors: legacyFieldErrors(result.fieldErrors, { amount: "amount" }),
  };
}

export async function requestWithdrawal(
  _prev: WalletActionResult,
  formData: FormData,
): Promise<WalletActionResult> {
  const bankName = String(formData.get("bankName") ?? "").trim();
  const bank = bankByName(bankName);
  if (!bank) {
    return { ok: false, fieldErrors: { bankName: "Choose a bank from the list." } };
  }

  const session = await resolveSession();
  const accountName =
    session.state === "signed-in"
      ? ((session.user.user_metadata["full_name"] as string | undefined) ??
        session.user.email ??
        "RentMe member")
      : "RentMe member";

  const mapped = new FormData();
  mapped.set("amount", String(formData.get("amount") ?? ""));
  mapped.set("bankCode", bank.code);
  mapped.set("accountNumber", String(formData.get("accountNumber") ?? ""));
  mapped.set("accountName", accountName);

  const result = await withdraw(EMPTY_ENVELOPE, mapped);
  if (result.ok && result.data) {
    return {
      ok: true,
      amountMinor: result.data.amountMinor,
      message: `Your withdrawal to ${result.data.bankName} ****${result.data.accountLast4} is on its way. It completes the moment the bank confirms.`,
    };
  }
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message: result.error || undefined,
    fieldErrors: legacyFieldErrors(result.fieldErrors, {
      amount: "amount",
      bankCode: "bankName",
      accountNumber: "accountNumber",
    }),
  };
}

export async function requestTransfer(
  _prev: WalletActionResult,
  formData: FormData,
): Promise<WalletActionResult> {
  const recipient = String(formData.get("recipient") ?? "").trim();
  if (recipient.length > 0 && !recipient.includes("@")) {
    return {
      ok: false,
      fieldErrors: { recipient: "Transfers use the recipient's RentMe email address for now." },
    };
  }

  const mapped = new FormData();
  mapped.set("recipientEmail", recipient);
  mapped.set("amount", String(formData.get("amount") ?? ""));

  const result = await transferToUser(EMPTY_ENVELOPE, mapped);
  if (result.ok && result.data) {
    return {
      ok: true,
      amountMinor: result.data.amountMinor,
      message: `Sent to ${result.data.recipientName}. Their wallet has it already.`,
    };
  }
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message: result.error || undefined,
    fieldErrors: legacyFieldErrors(result.fieldErrors, {
      amount: "amount",
      recipientEmail: "recipient",
    }),
  };
}
