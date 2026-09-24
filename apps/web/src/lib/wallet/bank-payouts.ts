/**
 * WHETHER MONEY CAN LEAVE A VALLO WALLET FOR A BANK (MON-04).
 *
 * Not yet. Every route in is live (a card or bank top-up, the card-save
 * top-up, a stay refund), but a transfer out to a bank does not complete: the
 * Paystack account cannot send third-party transfers, so the withdraw sheet is
 * not drawn (WalletDeck) and an agent's earnings are recorded, not paid out.
 * What is true today is that wallet money can be spent on Vallo and sent to
 * other Vallo members, and becomes withdrawable when bank payouts open.
 *
 * Every sentence a person reads about getting money out of the wallet, or
 * about an agent being paid to a bank, is chosen by this one constant: the
 * Terms (section 5), the cancellations page, the help centre, the emails that
 * land money in a wallet, the payment-methods panel and the account-deletion
 * blocker. The day payouts complete, set it to true (and bump TERMS_VERSION in
 * lib/legal/versions.ts, because the Terms text changes with it).
 *
 * No date is promised anywhere, on purpose.
 *
 * Client-safe: constants only.
 */
export const BANK_PAYOUTS_OPEN = false;

/** One sentence: how money in the wallet can be used. */
export const WALLET_MONEY_USES = BANK_PAYOUTS_OPEN
  ? "Money in your Vallo wallet can be spent on Vallo, sent to other Vallo members, or moved to your own Nigerian bank account whenever you want."
  : "Money in your Vallo wallet can be spent on Vallo and sent to other Vallo members. Withdrawal to a bank account is not available yet; it will be once bank payouts open.";

/** For an email or a notice that has just put money in somebody's wallet. */
export const WALLET_MONEY_NEXT = BANK_PAYOUTS_OPEN
  ? "You can spend it on Vallo, send it to another Vallo member, or withdraw it to your bank account."
  : "You can spend it on Vallo or send it to another Vallo member. Withdrawal to a bank account is not available yet; it will be once bank payouts open.";

/** The Terms, section 5: where a refund goes and what can be done with it. */
export const TERMS_REFUND_LINE = BANK_PAYOUTS_OPEN
  ? "Refunds go to your Vallo wallet in naira, and you can move money from there to your bank."
  : "Refunds go to your Vallo wallet in naira. Money in the wallet can be spent on Vallo and sent to other Vallo members; withdrawal to a bank account is not available yet and will be once bank payouts open.";

/** The help centre's answer to "When do agents get paid?". */
export const AGENT_PAYOUT_ANSWER = BANK_PAYOUTS_OPEN
  ? "After each completed stay, your earnings are paid to the Nigerian bank account you added during your application. You can follow every payout from the earnings page in your agent workspace."
  : "Paying earnings out to a bank is not open yet. What each completed stay earns you is recorded against your account, and you can follow it from the earnings page in your agent workspace. It is paid to the Nigerian bank account you added once bank payouts open.";
