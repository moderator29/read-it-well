import { formatMoney, formatMoneyGlance, type Locale } from "@vallo/i18n/core";
import { spokenMoney, type SpokenPeriod } from "@/lib/money/spoken";

/**
 * B15: A FIGURE THE EYE READS SHORT AND THE EAR HEARS WHOLE.
 *
 * Prints the compact figure ("₦2.8m") hidden from assistive technology, and
 * beside it a visually hidden spoken form ("2.8 million naira a year"). Use
 * it wherever money is compact: map pins, cards, the sticky price bar.
 * Server-safe: no state, no effects.
 *
 *   mode "compact"  always compact (a pin, a tile);
 *   mode "glance"   compact from one million naira (a card in a list);
 *   mode "full"     the full figure, still with the period said in words.
 */
export function Money({
  minor,
  locale,
  currency = "NGN",
  mode = "compact",
  period = null,
  suffix,
  className,
}: {
  minor: number;
  locale: Locale;
  currency?: string;
  mode?: "compact" | "glance" | "full";
  /** Said to the ear ("a year"); printed only if `suffix` is given. */
  period?: SpokenPeriod | null;
  /** A printed period such as "/yr", hidden from the ear with the figure. */
  suffix?: string;
  className?: string;
}) {
  const printed =
    mode === "glance"
      ? formatMoneyGlance(minor, locale, currency)
      : formatMoney(minor, locale, currency, { compact: mode === "compact" });
  return (
    <span className={className} data-money="">
      <span aria-hidden="true">
        {printed}
        {suffix}
      </span>
      <span className="sr-only">{spokenMoney(minor, locale, currency, period)}</span>
    </span>
  );
}
