/**
 * Nigerian banks for wallet withdrawals.
 *
 * The same institutions as NIGERIAN_BANKS in lib/data/nigeria.ts, each paired
 * with its Paystack payout code so the withdrawal form can submit a code the
 * transfer API accepts directly. The list is a curated starting set, not the
 * whole registry; listBanks() in lib/payments/paystack.ts can fetch the full
 * live registry once an admin surface needs it.
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

/** Look a bank up by its payout code. */
export function bankByCode(code: string): WalletBank | undefined {
  return WALLET_BANKS.find((b) => b.code === code);
}

/** Look a bank up by its display name (used by the legacy form field). */
export function bankByName(name: string): WalletBank | undefined {
  return WALLET_BANKS.find((b) => b.name === name);
}
