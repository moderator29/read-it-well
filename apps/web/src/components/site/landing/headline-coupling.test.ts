import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary, type Locale } from "@vallo/i18n";
import { ORDER } from "./segments";

/**
 * THE HEADLINE AND THE SEARCH CONTROL SAY THE SAME THREE WORDS, AND THIS IS
 * WHAT STOPS THEM DRIFTING APART.
 *
 * The founder's approved headline is "Rent, buy or stay. Without the
 * runaround." It uses the landing search control's own three verbs, and
 * HANDOFF 09 section 2.1 is explicit about why: the headline teaches the
 * control and the control proves the headline, so if one changes the other
 * changes in the same commit. A rule written in a comment is a rule somebody
 * eventually edits past. This is the same rule with a build behind it.
 *
 * WHAT IT ASSERTS, in the language the reader actually sees:
 *
 *   - The control still has exactly the three segments the headline names.
 *   - For every locale, each of those three segment labels appears in that
 *     locale's headline.
 *
 * The second one has to know which language the headline is in. A locale that
 * has not translated the headline serves the English one through
 * `withFallback`, and English words cannot be expected inside a Hausa
 * sentence or the reverse. So the test resolves the headline's language
 * first: identical to English means the reader is being shown English, and
 * the English labels are what must appear in it. When a native speaker
 * translates the headline, that locale's own labels become the ones checked,
 * and a translation that names only two of the three verbs fails here rather
 * than shipping.
 *
 * IF THIS TEST GOES RED, DO NOT LOOSEN IT. Either the headline lost one of
 * the control's words or the control gained a word the headline does not say,
 * and both of those are the drift it exists to catch.
 */

/** Case and punctuation carry no meaning for this comparison; the words do. */
function words(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[.,;:!?'"’“”()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("the landing headline and the search control", () => {
  it("offers exactly the three segments the headline names", () => {
    expect([...ORDER]).toEqual(["buy", "rent", "stay"]);
  });

  it("names every segment of the control in the headline, in every locale", () => {
    const en = getDictionary("en");

    for (const locale of LOCALES) {
      const d = getDictionary(locale);
      const headline = d.landing.face.hero.title1;

      /* An untranslated headline is served in English, so English is the
         language whose words must appear in it. */
      const shownIn: Locale = headline === en.landing.face.hero.title1 ? "en" : locale;
      const labels = getDictionary(shownIn).landing.face.search;

      for (const segment of ORDER) {
        expect(
          words(headline),
          `${locale}: the headline "${headline}" does not name the control's "${labels[segment]}" segment`,
        ).toContain(words(labels[segment]));
      }
    }
  });

  it("keeps the second line of the headline on the position it states", () => {
    /* "Without the runaround" is the position itself, not decoration: Vallo
       does not remove the agent, it removes the runaround. A rewrite that
       drops the word has changed what the platform claims to be. */
    for (const locale of LOCALES) {
      const d = getDictionary(locale);
      const en = getDictionary("en");
      if (d.landing.face.hero.title2 !== en.landing.face.hero.title2) continue;
      expect(words(d.landing.face.hero.title2)).toContain("runaround");
    }
  });
});
