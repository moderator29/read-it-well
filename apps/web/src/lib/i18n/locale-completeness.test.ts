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
 * ## THE JUMP TO 336 AND THE RETURN TO 212, AND WHY BOTH ARE RECORDED
 *
 * The `supply` namespace grew from 60 keys to 204 between `e36e74f` and
 * `1c6388d`, in English only. For those commits `yo.supply`, `ha.supply` and
 * `ig.supply` were still the original 60, so `withFallback` served 144 English
 * strings under a namespace that had been complete, and the English SENTENCE
 * count went from 106 to 182 in one step. A3 measured that state and raised
 * these ceilings to 336 / 334 / 343 and 182, correctly, because a red shared
 * test blocks everybody.
 *
 * THAT STATE LASTED ABOUT AN HOUR AND THE CEILINGS OUTLIVED IT. The namespace
 * is B1b's three registration forms, GOVERNING-03, 04 and 05, and the English
 * half of it reached the branch first only because it was swept up in another
 * worker's commit; the Hausa, Igbo and Yoruba halves were written in the same
 * stint and landed with the forms at `0b45e92`. Re-measured on this tree
 * against 2,758 English keys: **yo 212, ha 210, ig 219, and 106 English
 * sentences in each**, which is where all three stood before the namespace
 * existed. So the ceilings come back down to the measurement.
 *
 * THE POINT OF PUTTING BOTH NUMBERS HERE rather than quietly restoring the old
 * ones: a ceiling that is loose by 124 keys is worse than no ceiling, because
 * the next person trusts it and 124 English strings could be added to a
 * translation file under it without a single test going red. A ratchet is only
 * a ratchet while it sits on the measurement.
 *
 * THE THREE SUPPLY FORMS ARE TRANSLATED AND THEY NEED A NATIVE READER. Every
 * one of the 144 keys carries Hausa, Igbo and Yoruba written from the
 * vocabulary of the agent application block already in each file, so the
 * screens do not mix languages. That is not the same as being right, and each
 * locale file's own header already says the whole file needs native review
 * before launch. This namespace is now part of what that review covers.
 *
 * AND THE MECHANISM IS WORTH RECORDING TOO, because it is a process fault and
 * not a translation one. Those 180 lines reached the branch inside a commit
 * whose message describes the admin console, because `en.ts` was carrying
 * another worker's UNCOMMITTED edits in the shared tree when it was staged by
 * path. An explicit pathspec is not enough on a file thirteen people share:
 * the unit of collision is the FILE, not the change.
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
 * THESE CEILINGS WERE RECALIBRATED ON 22 SEPTEMBER AND THEY DROPPED BY MORE
 * THAN HALF, because the measure beneath them was counting the wrong thing.
 *
 * `localeCompleteness` counted every key whose rendered text equals English.
 * A locale module exports `withFallback({...})`, so that included every key
 * the locale has simply NOT REACHED YET, and adding one English key to `en.ts`
 * raised all three counts at once and tripped this gate. The only way past was
 * to raise the ceiling, and a gate whose ceiling must be raised on every
 * ordinary commit teaches people to raise ceilings. It sat red on main because
 * of exactly that, from an unrelated session's copy addition.
 *
 * It now counts only keys the locale DECLARED FOR ITSELF and gave the English
 * string, which is the actual defect: English smuggled into a translation file
 * to make coverage look finished. The old numbers were 212 / 210 / 219 against
 * a measure that could not tell smuggling from an untranslated key. The
 * measured truth is below.
 *
 * LEAVING THE OLD CEILINGS IN PLACE WOULD HAVE BEEN WORSE THAN THE RED. With
 * the measure corrected and the ceiling at 212, somebody could paste a hundred
 * English strings into `yo.ts` and this would stay green. A ratchet is only a
 * ratchet when it sits on the current value.
 */
const KNOWN_INCOMPLETE = {
  yo: { englishValued: 98, englishSentences: 57 },
  ha: { englishValued: 100, englishSentences: 57 },
  ig: { englishValued: 105, englishSentences: 57 },
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
