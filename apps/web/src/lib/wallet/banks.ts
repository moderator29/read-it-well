/**
 * A PICKER'S SEED. NOT A LIST OF THE BANKS THAT EXIST, AND NOT A VALIDATOR.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS FOR NOW, AND WHAT IT IS NO LONGER FOR.
 *
 * Twenty three Nigerian institutions with their Paystack payout codes. It is
 * the first thing a bank `<select>` can draw before the live registry answers,
 * so a picker is never empty on a cold render. That is its whole remaining
 * job.
 *
 * UNTIL 23 SEPTEMBER IT WAS ALSO THE WITHDRAWAL'S VALIDATOR, and that cost a
 * real person money they could not reach. `withdrawSchema` checked the posted
 * bank code against these twenty three, while the payments settings page and
 * the send desk both checked against the LIVE registry of about a hundred. So
 * somebody could file a Kuda, Opay, Palmpay, Moniepoint, Sparkle, VFD or Jaiz
 * account on the settings page, see it stored with the name the bank gave,
 * and then find the withdraw sheet would not pay it. Two lists, one
 * processor, and the SHORT one standing between a person and their balance.
 *
 * So nothing validates against this any more. `lookupBank` in
 * `lib/payments/bank-resolve.ts` is the one answer to "is this a real bank",
 * it asks the live registry, and it refuses rather than shrugs when that
 * registry cannot be read.
 *
 * ---------------------------------------------------------------------------
 * WHY IT STILL EXISTS AT ALL, SINCE A DEAD LIST IS HOW THE TWO DIVERGED.
 *
 * One component still imports it as its picker's seed:
 * `app/(app)/wallet/WalletDeck.tsx` (the withdraw sheet, which draws its
 * options from here and nowhere else). (The send desk's bank picker was
 * removed with bank send on 23 September.) The withdraw sheet should move to
 * `listBanks()`. THE DAY IT DOES, DELETE THIS FILE.
 *
 * Until then the honest description of the gap is: the server will now pay any
 * bank the live registry knows, and the withdraw sheet's `<select>` still only
 * offers these twenty three. That is one screen behind, not two sources of
 * truth about what a payout may address.
 *
 * NO LOOKUP FUNCTIONS LIVE HERE. `bankByCode` and `bankByName` are gone:
 * a lookup against this list is exactly the mistake above, and leaving the
 * helpers behind is how somebody writes it again.
 */

export type WalletBank = {
  name: string;
  code: string;
};

export const WALLET_BANKS: readonly WalletBank[] = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank", code: "023" },
  { name: "Ecobank", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Microfinance Bank", code: "50211" },
  { name: "Moniepoint", code: "50515" },
  { name: "Opay", code: "999992" },
  { name: "Palmpay", code: "999991" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank", code: "032" },
  { name: "United Bank for Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
] as const;
