import { z } from "zod";

/**
 * Payout account input, and the bits the form and the action both need.
 *
 * Client-safe: imports nothing server-only, so the payout form can use the
 * NUBAN rules and the grouping helper without pulling a server module into the
 * browser bundle.
 */

/** A Nigerian NUBAN is exactly ten digits. The database checks this too. */
export const NUBAN_LENGTH = 10;
const NUBAN_RE = /^\d{10}$/;

/** Strip everything that is not a digit, so paste and spacing both work. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Display grouping for a NUBAN: 0123 456 789. The stored value stays bare, so
 * this is presentation only and never reaches the database.
 */
export function groupNuban(value: string): string {
  const digits = digitsOnly(value).slice(0, NUBAN_LENGTH);
  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 10)];
  return parts.filter((p) => p.length > 0).join(" ");
}

const accountNumber = z
  .string({ message: "Enter the ten digit account number." })
  .transform(digitsOnly)
  .refine((v) => NUBAN_RE.test(v), "A Nigerian account number is exactly ten digits.");

export const resolveAccountInputSchema = z.object({
  accountNumber,
  bankCode: z.string().min(1, "Choose the bank."),
});

export const addPayoutAccountInputSchema = z.object({
  accountNumber,
  bankCode: z.string().min(1, "Choose the bank."),
  bankName: z.string().min(1, "Choose the bank."),
  /**
   * The name the bank returned, carried through from the resolve step. It is
   * re-resolved server side before the insert, so a tampered value cannot be
   * stored: this field only saves a second round trip in the happy path.
   */
  accountName: z.string().min(1, "Confirm the account before saving it."),
});

export const payoutAccountIdSchema = z.object({
  accountId: z.string().min(1, "That account could not be identified."),
});

export type AddPayoutAccountInput = z.infer<typeof addPayoutAccountInputSchema>;
