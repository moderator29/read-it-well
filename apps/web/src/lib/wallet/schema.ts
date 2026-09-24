import { z } from "zod";
import { isRecipientInput } from "./recipient-input";
import { formatMoney } from "@vallo/i18n";

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

/**
 * One key per submit, minted by the surface. Optional so every existing form
 * keeps working; when present, a dropped connection and a second tap replay
 * the first answer instead of opening a second charge (an audit of 73e284e
 * found it: a double submit charged twice under two references).
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
   * Named here for the same reason as on `transferSchema`. The withdraw sheet
   * in WalletDeck mints one per open sheet (MON-01).
   *
   * A CORRECTION TO WHAT THIS COMMENT SAID UNTIL 23 SEPTEMBER. It read
   * "`withdraw` is wrapped in the guard, and the guard steps aside when no key
   * arrives, so this changes nothing until the form carries one". The second
   * half was true and the first half was not: `withdraw` was not wrapped in
   * anything, and this field was parsed and then dropped on the floor. So the
   * schema named a key, the schema's own note claimed a guard, and two taps
   * on Withdraw made two withdrawals. It is wrapped now, under
   * `wallet.withdraw`, and the guard steps aside when no key arrives.
   */
  idempotencyKey: idempotencyKeySchema,
  amount: nairaAmountSchema,
  /*
   * THE BANK CODE IS NO LONGER CHECKED AGAINST A HAND-TYPED LIST.
   *
   * It used to be checked against the twenty three names in `./banks`, and
   * that list had drifted away from the LIVE registry of about a hundred that
   * the payments settings page and the send desk both use. The result was a
   * person filing a Kuda, Opay, Palmpay, Moniepoint, Sparkle, VFD or Jaiz
   * account on the settings page and then finding the withdraw sheet could
   * not pay it: two lists, one processor, and the short one guarding the
   * money.
   *
   * A schema cannot ask a registry: this module is synchronous, imported by
   * the browser bundle through the send screen, and a network call inside a
   * Zod refinement would be a network call on every keystroke of every form
   * that shares it. So the shape is checked here and the MEMBERSHIP is
   * checked in `withdraw`, by `lookupBank`, against the same live registry
   * every other door asks, BEFORE a kobo is held and before the processor is
   * called. That was the same division the send-to-a-bank schema below used,
   * before that door was removed.
   *
   * WIDENING A SCHEMA WIDENS A PAYOUT PATH, so read the rest of that
   * sentence: `lookupBank` refuses a registry it could not read rather than
   * letting the code through, which is the one way this change could have
   * gone wrong.
   */
  bankCode: z.string().trim().min(1, "Choose your bank."),
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
  /* An email address or a public @handle (recipient-input.ts). */
  recipientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .refine(isRecipientInput, "Enter a valid email address or @handle."),
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

/*
 * `bankTransferSchema` WAS HERE AND IS GONE, 23 September.
 *
 * It shaped the send-to-a-bank form. That door was removed on the founder's
 * direction: moving a member's money to a third party's bank account is a
 * licensed activity VALLO SPACES LTD is not licensed for. The action, its
 * receipt type, its idempotency scope and its socket test went at the same
 * time; see the note in `lib/wallet/actions.ts`. A schema with no caller is
 * a door left ajar, so it goes too rather than waiting to be noticed.
 *
 * `withdrawSchema` above is the surviving payout shape, and it is a different
 * thing: a person taking their own money out.
 */

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
