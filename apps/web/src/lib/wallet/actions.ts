"use server";

/**
 * Wallet server actions.
 *
 * Validation is real and runs on the server; money movement is not wired yet,
 * so every action ends in a plain, honest result rather than a fake success
 * (Master Rule 8). Amounts arrive as naira text from the form and are
 * converted to integer kobo exactly once, here at the input boundary, with
 * Math.round(naira * 100); beyond this line money is integer kobo only
 * (Master Rule 50). When the payment environment is configured these actions
 * will hand the validated kobo amount to the payment service, which writes
 * the ledger through the service role.
 */

import { NIGERIAN_BANKS } from "../data/nigeria";

export type WalletActionField = "amount" | "bankName" | "accountNumber" | "recipient";

export type WalletActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<WalletActionField, string>>;
  /** The validated amount in integer kobo, echoed back for display. */
  amountMinor?: number;
};

/** ₦100 minimum keeps processor fees sane; ₦10,000,000 is the single-move cap. */
const MIN_KOBO = 100_00;
const MAX_KOBO = 10_000_000_00;

// Naira as typed: digits, optional thousands commas, at most two decimals.
const NAIRA_RE = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;

// Nigerian mobile numbers: 11 digits local (0803...) or +234 form.
const PHONE_RE = /^(\+?234|0)\d{10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Parse a naira string to integer kobo. This is the only place a float exists,
 * and it is rounded away immediately. Returns null when the text is not a
 * well-formed naira amount.
 */
function parseNairaToKobo(raw: string): number | null {
  const trimmed = raw.trim().replace(/^₦/, "").trim();
  if (!NAIRA_RE.test(trimmed)) return null;
  const naira = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(naira)) return null;
  return Math.round(naira * 100);
}

function validateAmount(
  formData: FormData,
  fieldErrors: NonNullable<WalletActionResult["fieldErrors"]>,
): number | null {
  const raw = String(formData.get("amount") ?? "");
  if (!raw.trim()) {
    fieldErrors.amount = "Enter an amount.";
    return null;
  }
  const kobo = parseNairaToKobo(raw);
  if (kobo === null) {
    fieldErrors.amount = "Enter a valid naira amount, e.g. 5,000 or 5000.50.";
    return null;
  }
  if (kobo < MIN_KOBO) {
    fieldErrors.amount = "The minimum is ₦100.";
    return null;
  }
  if (kobo > MAX_KOBO) {
    fieldErrors.amount = "The maximum for a single movement is ₦10,000,000.";
    return null;
  }
  return kobo;
}

/**
 * The honest ending shared by all three actions until the payment environment
 * (PAYSTACK_SECRET_KEY and the service-role writer) is configured and the
 * funding, payout and transfer flows are implemented against it.
 */
function notWiredYet(amountMinor: number, verb: string): WalletActionResult {
  return {
    ok: false,
    amountMinor,
    message:
      `Your request to ${verb} is valid, but the wallet service connects the moment ` +
      "the payment environment is added. No money has moved and nothing was charged.",
  };
}

export async function requestDeposit(
  _prev: WalletActionResult,
  formData: FormData,
): Promise<WalletActionResult> {
  const fieldErrors: NonNullable<WalletActionResult["fieldErrors"]> = {};
  const amountMinor = validateAmount(formData, fieldErrors);
  if (amountMinor === null) return { ok: false, fieldErrors };

  return notWiredYet(amountMinor, "add money");
}

export async function requestWithdrawal(
  _prev: WalletActionResult,
  formData: FormData,
): Promise<WalletActionResult> {
  const fieldErrors: NonNullable<WalletActionResult["fieldErrors"]> = {};
  const amountMinor = validateAmount(formData, fieldErrors);

  const bankName = String(formData.get("bankName") ?? "").trim();
  if (!bankName) {
    fieldErrors.bankName = "Choose your bank.";
  } else if (!(NIGERIAN_BANKS as readonly string[]).includes(bankName)) {
    fieldErrors.bankName = "Choose a bank from the list.";
  }

  const accountNumber = String(formData.get("accountNumber") ?? "").replace(/\s/g, "");
  if (!accountNumber) {
    fieldErrors.accountNumber = "Enter the account number.";
  } else if (!/^\d{10}$/.test(accountNumber)) {
    fieldErrors.accountNumber = "A Nigerian account number is 10 digits.";
  }

  if (amountMinor === null || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return notWiredYet(amountMinor, "withdraw");
}

export async function requestTransfer(
  _prev: WalletActionResult,
  formData: FormData,
): Promise<WalletActionResult> {
  const fieldErrors: NonNullable<WalletActionResult["fieldErrors"]> = {};
  const amountMinor = validateAmount(formData, fieldErrors);

  const recipient = String(formData.get("recipient") ?? "").trim();
  const asPhone = recipient.replace(/\s/g, "");
  if (!recipient) {
    fieldErrors.recipient = "Enter the recipient's email or phone number.";
  } else if (!EMAIL_RE.test(recipient) && !PHONE_RE.test(asPhone)) {
    fieldErrors.recipient = "Enter a valid email address or Nigerian phone number.";
  }

  if (amountMinor === null || Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return notWiredYet(amountMinor, "transfer");
}
