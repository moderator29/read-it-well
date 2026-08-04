import { formatMoney, type Locale } from "@naijafinds/i18n";

/**
 * Kobo-exact money display.
 *
 * formatMoney now shows kobo whenever there is kobo, so this is no longer
 * about correctness; it is about TYPOGRAPHY. The balance card sets the naira
 * at 2.6rem and the kobo at 1.4rem beside it, and the odometer rolls only the
 * whole-naira digits, so the two parts have to arrive separately.
 *
 * The split is integer arithmetic throughout: no floats, at any point. Any
 * surface that just wants the figure should call formatMoney directly.
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
