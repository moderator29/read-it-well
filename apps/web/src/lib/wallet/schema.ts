import { z } from "zod";
import { WALLET_BANKS } from "./banks";

/**
 * Wallet input schemas.
 *
 * Amounts arrive as naira text from the form and are converted to integer
 * kobo exactly once, here at the input boundary, with Math.round(naira * 100)
 * (Master Rule 50). Beyond these schemas money is integer kobo only. Every
 * message is plain language ready to render beside its field.
 */

/** The minimum single movement, in kobo. */
export const MIN_MOVE_KOBO = 100_00;
/** The single-movement cap, in kobo. */
export const MAX_MOVE_KOBO = 10_000_000_00;

// Naira as typed: digits, optional thousands commas, at most two decimals.
const NAIRA_RE = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;

/**
 * Parse a naira string to integer kobo. This is the only place a float
 * exists, and it is rounded away immediately. Returns null when the text is
 * not a well-formed naira amount.
 */
export function parseNairaToKobo(raw: string): number | null {
  const trimmed = raw.trim().replace(/^₦/, "").trim();
  if (!NAIRA_RE.test(trimmed)) return null;
  const naira = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(naira)) return null;
  return Math.round(naira * 100);
}

/** Naira text in, integer kobo out, with the platform's movement bounds. */
export const nairaAmountSchema = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .transform((raw, ctx) => {
    const kobo = parseNairaToKobo(raw);
    if (kobo === null) {
      ctx.addIssue({ code: "custom", message: "Enter a valid naira amount, e.g. 5,000 or 5000.50." });
      return z.NEVER;
    }
    if (kobo < MIN_MOVE_KOBO) {
      ctx.addIssue({ code: "custom", message: "The minimum is ₦100." });
      return z.NEVER;
    }
    if (kobo > MAX_MOVE_KOBO) {
      ctx.addIssue({ code: "custom", message: "The maximum for a single movement is ₦10,000,000." });
      return z.NEVER;
    }
    return kobo;
  });

const BANK_CODES = new Set(WALLET_BANKS.map((b) => b.code));

export const fundSchema = z.object({
  amount: nairaAmountSchema,
});

export const withdrawSchema = z.object({
  amount: nairaAmountSchema,
  bankCode: z
    .string()
    .trim()
    .min(1, "Choose your bank.")
    .refine((code) => BANK_CODES.has(code), "Choose a bank from the list."),
  accountNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .refine((v) => /^\d{10}$/.test(v), "A Nigerian account number is 10 digits."),
  accountName: z
    .string()
    .trim()
    .min(3, "Enter the name on the account.")
    .max(120, "Keep the account name under 120 characters."),
});

export const transferSchema = z.object({
  recipientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  amount: nairaAmountSchema,
  note: z
    .string()
    .trim()
    .max(140, "Keep the note under 140 characters.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

/** Funding references we generate: rm-fund-<uuid v4-shaped>. */
export const fundReferenceSchema = z
  .string()
  .regex(
    /^rm-fund-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    "That payment reference is not recognised.",
  );

export type FundInput = z.infer<typeof fundSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
