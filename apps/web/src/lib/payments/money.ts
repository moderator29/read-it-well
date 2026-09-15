import { formatMoney } from "@vallo/i18n";

/**
 * Kobo-exact naira for server copy.
 *
 * formatMoney renders whole naira, which would round a shortfall of
 * NGN 5,000.50 up to NGN 5,001 and misstate a balance by fifty kobo. Refusal
 * copy has to name the exact figure, so the amount is split with integer
 * arithmetic: the whole-naira part goes through formatMoney, the kobo
 * remainder is appended as two digits. No float touches money at any point
 * (Master Rule 50).
 */
export function nairaExact(minor: number): string {
  const abs = Math.abs(Math.trunc(minor));
  const kobo = abs % 100;
  const whole = formatMoney(abs - kobo);
  return kobo === 0 ? whole : `${whole}.${String(kobo).padStart(2, "0")}`;
}
