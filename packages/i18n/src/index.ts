import { en, type Dictionary } from "./locales/en";
import { yo } from "./locales/yo";
import { ha } from "./locales/ha";
import { ig } from "./locales/ig";

export type { Dictionary };

export const LOCALES = ["en", "yo", "ha", "ig"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

const dictionaries: Record<Locale, Dictionary> = { en, yo, ha, ig };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Display metadata for the language switcher. */
export const localeMeta: Record<Locale, { label: string; native: string; short: string }> = {
  en: { label: "English", native: "English", short: "EN" },
  yo: { label: "Yoruba", native: "Yorùbá", short: "YO" },
  ha: { label: "Hausa", native: "Hausa", short: "HA" },
  ig: { label: "Igbo", native: "Igbo", short: "IG" },
};

/**
 * BCP 47 tags. Yoruba, Hausa and Igbo all resolve to Nigeria, which is what
 * `Intl` needs for correct number and date grouping.
 */
/**
 * BCP 47 tags for Intl. Exported because the `<Amount>` primitive builds money
 * from `formatToParts` rather than a formatted string, and it must resolve the
 * same tag this file does. A second private copy would drift, which is exactly
 * how the naira sign ended up hard-coded in five places disagreeing with each
 * other about whether ha-NG puts a space after the symbol.
 */
export const intlTag: Record<Locale, string> = {
  en: "en-NG",
  yo: "yo-NG",
  ha: "ha-NG",
  ig: "ig-NG",
};

/**
 * Money.
 *
 * Amounts are ALWAYS integer minor units (kobo). Never pass a float, and never
 * store one. 100 kobo is 1 naira. This is the only place that divides.
 */
export function formatMoney(
  minorUnits: number,
  locale: Locale = DEFAULT_LOCALE,
  currency = "NGN",
  options: { compact?: boolean } = {},
): string {
  const major = minorUnits / 100;

  if (options.compact) {
    /*
     * COMPACT USED TO BE WRONG, AND WRONG ABOUT MONEY.
     *
     * `maximumFractionDigits: 0` was applied to every call, including compact
     * ones, and it overrides the fraction digit that compact notation exists
     * to show. ₦1,200,000 rendered as "₦1M", ₦12,500,000 as "₦13M". Those are
     * not abbreviations, they are different numbers, and they were on the
     * agent's earnings tile and on every price pin on the map.
     *
     * Left to itself the formatter gives ₦999, ₦45K, ₦1.2M, ₦1.2B, which is
     * exactly the scale asked for. The suffix is then lowered because that is
     * how naira is written in Nigeria: ₦45k, ₦1.2m, never ₦45K.
     *
     * Hausa abbreviates thousands as "D" for dubu and is lowered by the same
     * rule. That reads correctly, but it sits inside the same native review
     * the locale files are already waiting on.
     */
    const compact = new Intl.NumberFormat(intlTag[locale], {
      style: "currency",
      currency,
      notation: "compact",
    }).format(major);
    return compact.replace(/[A-Za-z]+$/, (suffix) => suffix.toLowerCase());
  }

  /*
   * Kobo shows when there is kobo, and never otherwise.
   *
   * A flat `maximumFractionDigits: 0` rounded ₦42,000.75 to ₦42,001, so the
   * wallet had to grow its own splitter to avoid misstating a balance by a
   * kobo. Nothing else on the platform used that splitter, which meant any
   * other surface handed a part-naira amount would quietly round it. Rounding
   * money is not a display choice.
   */
  const hasKobo = Math.abs(Math.round(minorUnits)) % 100 !== 0;
  return new Intl.NumberFormat(intlTag[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: hasKobo ? 2 : 0,
    maximumFractionDigits: hasKobo ? 2 : 0,
  }).format(major);
}

/**
 * Money at a glance: compact once, and only once, the figure needs it.
 *
 * `{ compact: true }` is unconditional and belongs where the SPACE is fixed and
 * tiny: a map pin, a stat tile. A card in a scrolling list is different. A stay
 * at ₦95,000 a night must read ₦95,000, because that is the number somebody is
 * comparing against the card below it, but a rental at ₦4,500,000 a year is
 * written ₦4.5m by every Nigerian who has ever advertised one, and it was
 * arriving as seven digits and a slash and a word on a 390px card.
 *
 * One threshold, one million naira, applied in one place: a search page that
 * mixes nightly stays and yearly rents then gets both right with no per-card
 * decision anywhere.
 */
const GLANCE_COMPACT_FROM_MINOR = 100_000_000;

export function formatMoneyGlance(
  minorUnits: number,
  locale: Locale = DEFAULT_LOCALE,
  currency = "NGN",
): string {
  return formatMoney(minorUnits, locale, currency, {
    compact: Math.abs(minorUnits) >= GLANCE_COMPACT_FROM_MINOR,
  });
}

export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(intlTag[locale], options).format(value);
}

/**
 * A star rating, per locale.
 *
 * One decimal place, always, so 5 reads as "5.0" beside 4.8 rather than
 * jumping a character width. `toFixed(1)` was being called directly in six
 * places, which hardcodes a full stop as the decimal separator and an ASCII
 * digit set; this goes through `Intl` like every other number on the platform.
 */
export function formatRating(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatDate(
  date: Date,
  locale: Locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  return new Intl.DateTimeFormat(intlTag[locale], options).format(date);
}
