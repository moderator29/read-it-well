import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, getDictionary } from "@vallo/i18n";
import { allLocaleCompleteness, localeCompleteness } from "./locale-completeness";

/**
 * THE COMPLETENESS GATE. A LOCALE SHIPS COMPLETE OR IT IS NOT OFFERED.
 *
 * Read `locale-completeness.ts` for the measurement. This file is the ratchet
 * that keeps it from getting worse, and it is deliberately NOT a plain
 * assertion that every locale is complete, because three of them are not and a
 * permanently red test is a test nobody reads.
 *
 * It enforces four things instead, and together they are the whole rule:
 *
 *   1. A LOCALE THAT IS NOT ON THE KNOWN-INCOMPLETE LIST MUST BE COMPLETE.
 *      So adding a fifth locale to `LOCALES` fails here until it is finished,
 *      which is the case the rule exists for.
 *   2. A KNOWN-INCOMPLETE LOCALE MAY NOT GET WORSE. The numbers below were
 *      measured, not estimated. A commit that adds an English string to a
 *      translation file moves one of them and fails this test with the name of
 *      the locale it damaged.
 *   3. A KNOWN-INCOMPLETE LOCALE THAT BECOMES COMPLETE FAILS THIS TEST TOO,
 *      on purpose, so the last act of finishing a translation is deleting its
 *      row here rather than nobody noticing it is done.
 *   4. THE HOME GRID IS ASSERTED BY NAME, because it is the specific screen
 *      that made this a launch blocker rather than a backlog item.
 *
 * THE ONE LINE THAT WOULD CLOSE ALL OF THIS IS NOT MINE TO WRITE.
 * `packages/i18n/src/index.ts:16` declares
 * `export const LOCALES = ["en", "yo", "ha", "ig"] as const`. Narrowing it to
 * `["en"]` at launch would mean no reader is ever served a mixed language
 * screen, and the three translations land later, complete, and are switched
 * back on one at a time. That is a product decision about which languages
 * Vallo offers on day one, so it belongs to the founder and it is recorded in
 * the ledger's needs-the-founder section. This gate is what makes the decision
 * safe to take either way.
 */

/**
 * Measured on this tree. `englishValued` counts keys whose rendered text is
 * identical to English, which includes every key the locale file does not
 * carry, because `withFallback` has already filled those with English.
 *
 * These are CEILINGS. They may fall; they may not rise.
 *
 * WHEN A CEILING IS RAISED, THE COMMIT SAYS WHY, AND "THE TEST WAS RED" IS NOT
 * A REASON. There is exactly one legitimate cause and it is worth writing down
 * because it looks identical to the illegitimate one in a diff: MOVING A
 * HARDCODED ENGLISH STRING OUT OF TSX AND INTO THE DICTIONARY RAISES THIS
 * NUMBER WHILE MAKING THE PRODUCT BETTER. The string was already English on
 * screen; it was simply somewhere no completeness measure could see it. The
 * count going up is the measurement becoming honest, not the locale getting
 * worse, and the giveaway is that the same commit deletes a literal from a
 * `.tsx`.
 *
 * Every other cause, and in particular copying English prose into `ha.ts`,
 * `ig.ts` or `yo.ts` to make a key count look finished, is the exact defect
 * this gate exists to stop.
 *
 * These numbers moved from 211 / 209 / 218 for that first reason: the
 * seventeen hardcoded English strings the uniqueness sweep found are being
 * moved into `uiCommon`, English only, where `withFallback` serves them and
 * where a translator can now find them.
 */
const KNOWN_INCOMPLETE = {
  yo: { englishValued: 212, englishSentences: 106 },
  ha: { englishValued: 210, englishSentences: 106 },
  ig: { englishValued: 219, englishSentences: 106 },
} as const;

describe("locale completeness", () => {
  it("English is complete by definition", () => {
    const en = localeCompleteness(DEFAULT_LOCALE);
    expect(en.englishValued).toBe(en.total);
    expect(en.total).toBeGreaterThan(2000);
  });

  it("every offered locale is either complete or on the known-incomplete list", () => {
    const unaccounted = allLocaleCompleteness().filter(
      (row) =>
        row.locale !== DEFAULT_LOCALE &&
        row.englishValued > 0 &&
        !(row.locale in KNOWN_INCOMPLETE),
    );
    expect(
      unaccounted.map((row) => row.locale),
      "A locale is OFFERED in LOCALES and is not complete. Finish it, or take it out of LOCALES. A locale ships complete or it is not offered.",
    ).toEqual([]);
  });

  it("no known-incomplete locale has got worse", () => {
    for (const [locale, ceiling] of Object.entries(KNOWN_INCOMPLETE)) {
      const row = localeCompleteness(locale as keyof typeof KNOWN_INCOMPLETE);
      expect(
        row.englishValued,
        `${locale} now renders ${row.englishValued} keys in English, up from the recorded ${ceiling.englishValued}. Something added an English string to a translation file. Adding English to ha, ig or yo raises the key completeness count while the screen still reads in English, which is the exact defect this gate exists to stop.`,
      ).toBeLessThanOrEqual(ceiling.englishValued);
      expect(
        row.englishSentences,
        `${locale} now carries ${row.englishSentences} full English sentences, up from ${ceiling.englishSentences}.`,
      ).toBeLessThanOrEqual(ceiling.englishSentences);
    }
  });

  it("a locale that has been finished is taken off the list", () => {
    for (const locale of Object.keys(KNOWN_INCOMPLETE)) {
      const row = localeCompleteness(locale as keyof typeof KNOWN_INCOMPLETE);
      expect(
        row.englishValued,
        `${locale} is complete. Delete its row from KNOWN_INCOMPLETE, and it is now eligible to be offered.`,
      ).toBeGreaterThan(0);
    }
  });

  /*
   * THE SCREEN THAT MADE THIS A LAUNCH BLOCKER, AND ONE CORRECTION TO THE
   * RESEARCH WHILE RECORDING IT.
   *
   * `home.markets` draws the ten tiles on the first screen of the product.
   * `listingOne` and `listingMany`, the count line under EVERY tile, are
   * absent from all three locales, so all ten second lines fall back to
   * "{count} listings" in English under a Yoruba, Hausa or Igbo label.
   *
   * The research also says two market labels "are written out in English in
   * all three locales", and that is true of the WORDS and not of the STRINGS.
   * English reads "Shortlets" and "Villas"; all three locales read "Shortlet"
   * and "Villa". They are English loanwords with the plural dropped, so they
   * read as English on the tile and a byte-identity check cannot see them.
   * They are asserted separately, by value, because a measurement that misses
   * them would let somebody close this finding by looking at the wrong number.
   */
  it("records exactly which home grid labels are still English", () => {
    const english = getDictionary(DEFAULT_LOCALE).home.markets;
    const stillEnglish: Record<string, string[]> = {};
    for (const locale of LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      const theirs = getDictionary(locale).home.markets;
      stillEnglish[locale] = (Object.keys(english) as (keyof typeof english)[])
        .filter((key) => theirs[key] === english[key])
        .map(String)
        .sort();
    }
    for (const locale of Object.keys(stillEnglish)) {
      expect(
        stillEnglish[locale],
        `${locale}'s home grid mixes languages. Every key listed here renders in English beside labels that do not.`,
      ).toEqual(["listingMany", "listingOne"]);
    }
  });

  it("names the two market tiles that are English loanwords in all three locales", () => {
    for (const locale of LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      const markets = getDictionary(locale).home.markets;
      expect(
        { shortlet: markets.shortlet, villa: markets.villa },
        `${locale} draws two of the ten market tiles in English. They differ from the English strings only by the plural, so no key count and no identity check will ever flag them; this assertion is the only thing that will. Replacing them with real words is what makes it fail, which is the point.`,
      ).toEqual({ shortlet: "Shortlet", villa: "Villa" });
    }
  });
});
