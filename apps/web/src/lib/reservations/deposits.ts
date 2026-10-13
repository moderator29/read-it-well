import { countOf, type Dictionary, type Locale } from "@vallo/i18n/core";

/**
 * D75: restaurant table deposits, the words. Pure, so the guest's line and
 * every refusal are unit tests. The money is the database's: migration
 * d75a_restaurant_deposits. Every sentence is `tableDeposits` in
 * packages/i18n, in the reader's language; this only picks which.
 */

export const RESTAURANT_DEPOSITS_FLAG = "restaurant_deposits";

export type DepositWords = Dictionary["tableDeposits"];

/** The database's refusal codes (`reservation_deposit_open`) and the action's own, to their sentence. */
const REFUSAL_KEYS: Record<string, keyof DepositWords["refusals"]> = {
  switched_off: "switchedOff",
  not_found: "notFound",
  no_deposit: "noDeposit",
  payee_not_set_up: "noDeposit",
  already_paid: "alreadyPaid",
  already_applied: "alreadyApplied",
  already_forfeited: "alreadyForfeited",
  pending: "pending",
  outcome_unknown: "outcomeUnknown",
  unavailable: "unavailable",
};

export function depositRefusal(reason: string, words: DepositWords["refusals"]): string {
  return words[REFUSAL_KEYS[reason] ?? "unavailable"];
}

export type DepositFacts = {
  status: string;
  amountMinor: number;
  refundUntil: string | null;
};

/**
 * What the guest reads on their reservation. `money` formats kobo for the
 * reader's locale. A deposit that took money always says where it went.
 */
export function depositLine(
  d: DepositFacts,
  money: (minor: number) => string,
  when: (iso: string) => string,
  words: DepositWords["status"],
): string | null {
  const fill = (line: string) => line.replace("{amount}", money(d.amountMinor));
  switch (d.status) {
    case "due":
    case "pending":
      return fill(words.due);
    case "paid":
      return d.refundUntil ? fill(words.paidUntil).replace("{when}", when(d.refundUntil)) : fill(words.paid);
    case "applied":
      return fill(words.applied);
    case "refund_due":
      return fill(words.refundDue);
    case "refunded":
      return fill(words.refunded);
    case "forfeited":
      return fill(words.forfeited);
    default:
      return null;
  }
}

/** What the venue reads on a table at its desk. `share` is the part that reaches its bank. */
export function venueDepositLine(
  d: DepositFacts & { venueShareMinor?: number | null },
  money: (minor: number) => string,
  words: DepositWords["desk"]["line"],
): string | null {
  const fill = (line: string) => line.replace("{amount}", money(d.amountMinor));
  switch (d.status) {
    case "due":
      return fill(words.due);
    case "pending":
      return fill(words.pending);
    case "paid":
      return fill(words.paid).replace("{share}", money(d.venueShareMinor ?? d.amountMinor));
    case "applied":
      return fill(words.applied);
    case "forfeited":
      return fill(words.forfeited);
    case "refund_due":
      return fill(words.refundDue);
    case "refunded":
      return fill(words.refunded);
    default:
      return null;
  }
}

/**
 * The restaurant's refund rule in plain words, for the hours it set: 0 is
 * "any time before your table", otherwise "at least N hours before".
 */
export function refundRuleLine(
  hours: number,
  words: Pick<DepositWords["guest"], "refundBefore" | "refundAnyTime">,
  locale: Locale = "en",
): string {
  return hours > 0 ? words.refundBefore.replace("{hours}", countOf(hours, "hours", locale)) : words.refundAnyTime;
}

/** True while a deposit is owed and the guest can pay it. */
export function depositPayable(status: string | null | undefined): boolean {
  return status === "due" || status === "pending";
}
