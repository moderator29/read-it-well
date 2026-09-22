import { DEFAULT_LOCALE, LOCALES, getDictionary, type Locale } from "@vallo/i18n";

/**
 * How much of a locale is actually in that locale.
 *
 * A LOCALE SHIPS COMPLETE OR IT IS NOT OFFERED. That is the rule this module
 * exists to make checkable, and it is not an abstract principle: Yoruba, Hausa
 * and Igbo are all offered today and all three render a MIXED LANGUAGE screen.
 *
 * ## What was measured, and it is worse than the key count says
 *
 * Measured against this tree, over 2,633 English string keys:
 *
 * | | yo | ha | ig |
 * |---|---|---|---|
 * | keys the locale file does not carry | 82 | 78 | 82 |
 * | keys it carries with the ENGLISH text in them | 98 | 100 | 105 |
 * | of those, full English sentences | 57 | 57 | 57 |
 *
 * So each locale is about 97 PER CENT COMPLETE BY KEY and that number is
 * misleading in the one direction that matters. `withFallback` serves English
 * for a key a locale lacks, which is correct and is why nothing crashes, but a
 * key that is PRESENT with English inside it is invisible to a key count and
 * identical on screen. Fifty seven complete English sentences sit inside each
 * of the three dictionaries.
 *
 * ## The home grid, which is the one anybody sees first
 *
 * `home.markets` has ten tile labels. Eight are translated in all three
 * locales. `shortlet` reads "Shortlet" and `villa` reads "Villa" in Yoruba,
 * Hausa AND Igbo: English loanwords with the plural dropped from "Shortlets"
 * and "Villas", which is why no key count and no identity check has ever
 * flagged them. And `listingOne` and `listingMany`, the count under every
 * tile, are MISSING from all three, so all ten second lines fall back to
 * "{count} listings".
 *
 * That is one grid, on the first screen of the product, carrying eight Yoruba
 * words, two English words and ten English count lines. Nobody reads that as a
 * Yoruba product with gaps. They read it as broken.
 *
 * ## Why this measures the SCREEN and not the file
 *
 * A locale file is a deep partial and `withFallback` merges it over English at
 * module load, so the only thing this module can see is what a reader sees.
 * That is deliberate rather than a limitation. A key that is missing and a key
 * that contains English are the same event for the person holding the phone,
 * and a completeness gate that counted only the first kind would have passed
 * all three of these locales at 97 per cent while the home grid mixed two
 * languages.
 *
 * It does mean a word that is genuinely the same in both languages counts as
 * untranslated. "Villa" may well be one. The remedy is a translator's
 * judgement recorded in the file, not a looser check here: the count is a
 * ratchet, and a locale whose real figure is six identical words will sit at
 * six and never move.
 */

export type LocaleCompleteness = {
  locale: Locale;
  /** Every string key in the English dictionary. */
  total: number;
  /**
   * Keys whose rendered value is byte-identical to English. Missing keys are
   * in here too, because `withFallback` has already filled them with English.
   */
  englishValued: number;
  /** Of those, the ones that are four words or more: prose, not a label. */
  englishSentences: number;
  /** `englishValued` as a share, rounded to three places. */
  englishShare: number;
};

function flatten(value: unknown, prefix = "", into = new Map<string, string>()) {
  if (value === null || typeof value !== "object") return into;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") into.set(path, child);
    else if (child && typeof child === "object" && !Array.isArray(child)) {
      flatten(child, path, into);
    }
  }
  return into;
}

export function localeCompleteness(locale: Locale): LocaleCompleteness {
  const english = flatten(getDictionary(DEFAULT_LOCALE));
  const theirs = flatten(getDictionary(locale));

  let englishValued = 0;
  let englishSentences = 0;
  for (const [key, value] of english) {
    if (theirs.get(key) !== value) continue;
    englishValued += 1;
    if (value.trim().split(/\s+/).length >= 4) englishSentences += 1;
  }

  return {
    locale,
    total: english.size,
    englishValued,
    englishSentences,
    englishShare: Math.round((englishValued / english.size) * 1000) / 1000,
  };
}

/** Every offered locale, measured. */
export function allLocaleCompleteness(): LocaleCompleteness[] {
  return LOCALES.map(localeCompleteness);
}
