import { z } from "zod";
import { formatMoney } from "@vallo/i18n";
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
    /* The bounds are stated by the formatter, not typed out. Both figures used
       to be hand-written naira strings that would silently stop agreeing with
       MIN_MOVE_KOBO and MAX_MOVE_KOBO the first time either constant moved,
       and they told the payer a limit without telling them what to do about
       it. A schema has no request locale, so this is English; the point is
       that there is one figure and one formatter, not two. */
    if (kobo < MIN_MOVE_KOBO) {
      ctx.addIssue({
        code: "custom",
        message: `The smallest amount you can move is ${formatMoney(MIN_MOVE_KOBO)}. Raise the amount and try again.`,
      });
      return z.NEVER;
    }
    if (kobo > MAX_MOVE_KOBO) {
      ctx.addIssue({
        code: "custom",
        message: `${formatMoney(MAX_MOVE_KOBO)} is the most you can move at once. Split it into smaller movements.`,
      });
      return z.NEVER;
    }
    return kobo;
  });

const BANK_CODES = new Set(WALLET_BANKS.map((b) => b.code));

/**
 * One key per submit, minted by the surface. Optional so every existing form
 * keeps working; when present, a dropped connection and a second tap replay
 * the first answer instead of opening a second charge (the lead's B0 audit
 * of 73e284e: a double submit charged twice under two references).
 */
const idempotencyKeySchema = z.string().trim().min(1).max(200).optional();

export const fundSchema = z.object({
  amount: nairaAmountSchema,
  idempotencyKey: idempotencyKeySchema,
});

/**
 * Funding with a card already on the account. The amount obeys the same
 * bounds as any other movement; the card is named by id and its token never
 * reaches this schema or the browser.
 */
export const fundWithSavedCardSchema = z.object({
  amount: nairaAmountSchema,
  methodId: z.uuid("Choose a card from your list."),
  idempotencyKey: idempotencyKeySchema,
});

export const withdrawSchema = z.object({
  /*
   * Named here for the same reason as on `transferSchema`, and with one
   * honest difference: NO WITHDRAWAL FORM MINTS A KEY YET. `withdraw` is
   * wrapped in the guard, and the guard steps aside when no key arrives, so
   * this changes nothing until the form carries one. The request to the
   * session that owns the withdrawal surfaces is in the ledger. Landing the
   * server half first means the form is a one-line change rather than a
   * change that has to arrive with its own backend.
   */
  idempotencyKey: idempotencyKeySchema,
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
  /*
   * THE ACCOUNT NAME IS NO LONGER AN INPUT.
   *
   * It was a required field on this schema and a text box on the sheet reading
   * "As it appears at your bank", which is the platform asking somebody to
   * type a fact it can look up - and typing it proved nothing, because what
   * they typed was never checked against the account. A confident typo went
   * straight into a payout instruction.
   *
   * `withdraw` now asks the bank itself, which answers with the real holder on
   * an account the bank has already done KYC against, and a wrong digit fails
   * there instead of resolving to a stranger. Taking the field off the schema
   * rather than leaving it optional is deliberate: an optional field is one a
   * future form can start posting again, and it must never be possible for a
   * caller to supply the name a payout is addressed to.
   */
});

/**
 * Withdrawing to an account already on file (public.bank_accounts, M12). The
 * account carries its own resolved name, bank and number, so the form sends
 * only which one. Additive beside withdrawSchema: the typed-in path is
 * untouched.
 */
export const withdrawToSavedAccountSchema = z.object({
  amount: nairaAmountSchema,
  bankAccountId: z.uuid("Choose an account from your list."),
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
  /*
   * THE FIELD WHOSE ABSENCE SENT MONEY TWICE.
   *
   * `SendFlow` has minted an `idempotencyKey` per mount and posted it as a
   * hidden input for as long as it has existed. This schema did not name the
   * field, and Zod strips what it does not name WITHOUT COMPLAINING, so the
   * key was thrown away between the form and the action on every send. Two of
   * the schemas immediately above already carried it, which is what makes
   * this an omission rather than a design: nothing failed, nothing warned,
   * and a second tap on Send moved the money a second time under a second
   * reference pair that the database had never seen and therefore could not
   * refuse.
   *
   * A silent strip is the worst failure mode a validator has. The field is
   * named here so that it survives, and `transferToUser` now uses it.
   */
  idempotencyKey: idempotencyKeySchema,
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
