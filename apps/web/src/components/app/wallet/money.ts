import { formatMoney, type Locale } from "@vallo/i18n";

/**
 * Kobo-exact money display.
 *
 * formatMoney now shows kobo whenever there is kobo, so this is no longer
 * about correctness; it is about TYPOGRAPHY. The balance card sets the naira
 * at 2.4rem on a 390px phone, rising to 2.75rem from 427px up, and the kobo at
 * 0.6em of whatever that is, and the odometer rolls only the whole-naira
 * digits, so the two parts have to arrive separately.
 *
 * This comment used to say 2.6rem and 1.4rem, which was the INTENT and never
 * the shipped value: `wallet.css` clamped the figure at `8.6vw`, which only
 * reaches 2.6rem at a 484px viewport, so every phone drew it 13 per cent
 * short. The clamp is fixed and this now says what the file does.
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
