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
const intlTag: Record<Locale, string> = {
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
  return new Intl.NumberFormat(intlTag[locale], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: options.compact ? "compact" : "standard",
  }).format(major);
}

export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(intlTag[locale]).format(value);
}

export function formatDate(
  date: Date,
  locale: Locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  return new Intl.DateTimeFormat(intlTag[locale], options).format(date);
}
