import { readAuthorization, type PaystackAuthorization, type VerifiedTransaction } from "./paystack";
import { isFundReference } from "./references";

/**
 * SAVING A CARD: WHAT THE ₦100 CHECK IS, AND HOW WE KNOW IT WORKED (B-6).
 *
 * Paystack only hands back a reusable card token after a real, successful
 * charge. So "Add a card" opens a ₦100 charge (`startCardSetup` in
 * `methods-actions.ts`), card channel only, under an `rm-fund-` reference with
 * `purpose: "card-setup"`, `save_card: true` and the payer's `user_id` in its
 * metadata. Our server wrote that metadata with the secret key; nothing in a
 * browser can change it.
 *
 * WHY IT ALWAYS READ AS PENDING. The in-app checkout confirmed the charge with
 * `paymentState`, which only knows booking references (`rm-book-`) and reads
 * the `transactions` row a booking settlement writes. A setup charge is never
 * a booking and never has that row, so every setup polled "pending" for ninety
 * seconds and ended on "we could not confirm that payment". The card was never
 * filed either: the webhook treats every `rm-fund-` charge as a retired wallet
 * top-up and refunds it, without looking at `save_card`.
 *
 * THE FIX: confirm the setup with Paystack's own verify, judged here. A setup
 * is confirmed only when ALL of these hold:
 *  - the reference is the one we asked about, and is an `rm-fund-` shape;
 *  - the metadata says it is a card setup AND names this signed-in person;
 *  - Paystack says `success` (or `reversed`: the ₦100 is being returned, which
 *    the webhook does within seconds, and the card was still charged and
 *    tokenised first);
 *  - the currency is NGN and the amount is exactly the setup amount;
 *  - the authorization is present and Paystack says it is reusable.
 *
 * THE ₦100 IS UNCHANGED BY THIS. The webhook still refunds every `rm-fund-`
 * charge to the card in full (`refundChargeToCard`, reason `wallet_retired`),
 * and the reconciliation sweep does the same for one the webhook missed. Vallo
 * never keeps it and never credits it anywhere. The copy says "returned to
 * your card", which is what happens.
 *
 * Pure: no I/O. The action that calls Paystack and files the card is
 * `confirmCardSetup` in `methods-actions.ts`.
 */

/** The smallest honest amount a card can be saved with: NGN 100, in kobo. */
export const CARD_SETUP_AMOUNT_MINOR = 100_00;

/** The metadata `purpose` a setup charge carries. */
export const CARD_SETUP_PURPOSE = "card-setup";

/** Why a verified charge will not save a card. Machine words, for the audit. */
export type CardSetupRefusal =
  | "not_a_setup"
  | "wrong_user"
  | "wrong_currency"
  | "wrong_amount"
  | "not_reusable";

export type CardSetupVerdict =
  | { kind: "confirmed"; authorization: PaystackAuthorization }
  | { kind: "pending" }
  | { kind: "failed" }
  | { kind: "refused"; reason: CardSetupRefusal };

/**
 * Judge one verified transaction against the setup we opened for `userId`.
 *
 * The ownership checks come FIRST and apply whatever the status: a charge that
 * is not this person's card setup gets the same refusal whether it succeeded
 * or failed, so the answer cannot be used to learn anything about somebody
 * else's payment.
 */
export function judgeCardSetupCharge(
  tx: VerifiedTransaction,
  expected: { reference: string; userId: string },
): CardSetupVerdict {
  if (!isFundReference(expected.reference) || tx.reference !== expected.reference) {
    return { kind: "refused", reason: "not_a_setup" };
  }
  const purpose = tx.metadata["purpose"];
  const saveCard = tx.metadata["save_card"];
  if (purpose !== CARD_SETUP_PURPOSE || (saveCard !== true && saveCard !== "true")) {
    return { kind: "refused", reason: "not_a_setup" };
  }
  if (tx.metadata["user_id"] !== expected.userId) {
    return { kind: "refused", reason: "wrong_user" };
  }

  const status = String(tx.status ?? "").toLowerCase();
  if (status === "failed") return { kind: "failed" };
  if (status !== "success" && status !== "reversed") {
    /* ongoing, pending, processing, queued, abandoned, or a word Paystack
       adds later: all "we do not know yet". Never "failed": a charge that
       moved and was reported as failed is how somebody pays twice. */
    return { kind: "pending" };
  }

  if (tx.currency !== "NGN") return { kind: "refused", reason: "wrong_currency" };
  if (tx.amountMinor !== CARD_SETUP_AMOUNT_MINOR) return { kind: "refused", reason: "wrong_amount" };

  const authorization = readAuthorization(tx.authorization);
  if (!authorization || !authorization.reusable) return { kind: "refused", reason: "not_reusable" };

  return { kind: "confirmed", authorization };
}

/**
 * What the person reads when a verified setup will not save a card. Each one
 * says what happened to the ₦100, because that is the question they have.
 */
export function cardSetupRefusalMessage(reason: CardSetupRefusal | "not_filed", reference: string): string {
  switch (reason) {
    case "not_a_setup":
    case "wrong_user":
      return "That card check does not belong to this account, so no card was saved.";
    case "wrong_currency":
    case "wrong_amount":
      return `That card check did not match the ₦100 we asked for, so no card was saved. Whatever was taken goes back to your card in full. Your reference is ${reference}.`;
    case "not_reusable":
      return "The check went through, but your bank does not allow this card to be saved for later payments, so it was not saved. The ₦100 goes back to your card.";
    case "not_filed":
      return `The check went through, but we could not save the card just now. The ₦100 goes back to your card. Please try adding it again in a few minutes. Your reference is ${reference}.`;
  }
}
