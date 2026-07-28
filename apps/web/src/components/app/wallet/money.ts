import { formatMoney, type Locale } from "@naijafinds/i18n";

/**
 * Kobo-exact money display.
 *
 * formatMoney renders whole naira (maximumFractionDigits 0), which would round
 * ₦5,000.50 up to ₦5,001. The wallet must never misstate money by a kobo, so
 * amounts are split with integer arithmetic: the whole-naira part goes through
 * formatMoney and the kobo remainder is appended as a two-digit suffix. No
 * floats are involved at any point.
 */
export function formatKoboExact(minor: number, locale: Locale): { whole: string; kobo: string } {
  const abs = Math.abs(minor);
  const koboPart = abs % 100;
  const wholeMinor = (abs - koboPart) * Math.sign(minor || 1);
  return {
    whole: formatMoney(wholeMinor, locale),
    kobo: `.${String(koboPart).padStart(2, "0")}`,
  };
}
