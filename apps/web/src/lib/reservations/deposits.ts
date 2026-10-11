/**
 * D75: restaurant table deposits (the OpenTable no-show pattern), the words.
 * Pure, so the guest's line and every refusal are unit tests. The money is the
 * database's: migration d75a_restaurant_deposits.
 */

export const RESTAURANT_DEPOSITS_FLAG = "restaurant_deposits";

const REFUSALS: Record<string, string> = {
  switched_off: "Table deposits are not open yet. Nothing has been charged.",
  not_found: "We could not find that reservation on your account.",
  no_deposit: "This table does not need a deposit.",
  payee_not_set_up: "This table does not need a deposit.",
  already_paid: "Your deposit for this table is already paid.",
  already_applied: "Your deposit was taken off your bill.",
  already_forfeited: "This deposit was kept by the restaurant under its cancellation rule.",
  pending: "A payment for this deposit is already open. If you closed it, try again in a little while.",
  outcome_unknown:
    "We could not confirm the payment page opened. Nothing is charged twice: if you paid, it shows here within a few minutes.",
  unavailable: "Card payment is temporarily unavailable. Nothing has been charged.",
};

export function depositRefusal(reason: string): string {
  return REFUSALS[reason] ?? REFUSALS.unavailable!;
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
export function depositLine(d: DepositFacts, money: (minor: number) => string, when: (iso: string) => string): string | null {
  const amount = money(d.amountMinor);
  switch (d.status) {
    case "due":
    case "pending":
      return `Deposit of ${amount} to hold this table. It comes off your bill; the restaurant confirms once it is paid.`;
    case "paid":
      return d.refundUntil
        ? `Deposit of ${amount} paid. It comes off your bill. Cancel before ${when(d.refundUntil)} and it all comes back to your card.`
        : `Deposit of ${amount} paid. It comes off your bill.`;
    case "applied":
      return `Deposit of ${amount} taken off your bill.`;
    case "refund_due":
      return `Deposit of ${amount} is on its way back to your card.`;
    case "refunded":
      return `Deposit of ${amount} refunded to your card.`;
    case "forfeited":
      return `Deposit of ${amount} kept by the restaurant under its cancellation rule.`;
    default:
      return null;
  }
}
