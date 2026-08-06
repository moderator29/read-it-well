import { describe, expect, it } from "vitest";
import { LOCALES, formatParty, getDictionary, intlTag, plural, type Locale } from "@naijafinds/i18n";

/**
 * Counted nouns, in all four languages.
 *
 * The defect this replaces was on a live screen: the admin stay detail read
 * "1 adults, 1 children", and the host's booking card said the same thing,
 * because the copy had one form per noun and no rule for picking another. The
 * guest surfaces had the opposite failure, a hand-written
 * `n === 1 ? "night" : "nights"`, which is correct English and wrong for a
 * product that ships in four languages.
 *
 * Zero, one and two are asserted for every noun in every locale because those
 * are the three counts where the categories actually differ. English and Hausa
 * split one from the rest; Yoruba and Igbo have a single category, so the same
 * phrase has to be right for all three counts rather than merely present.
 *
 * The expected strings are written out literally rather than read back from the
 * dictionary. A test that derives its expectation from the thing under test
 * proves only that the code is consistent with itself, and the whole point here
 * is that somebody reading this file can see what a Yoruba guest is shown.
 */

const EXPECTED: Record<Locale, Record<"nights" | "guests" | "adults" | "children", [string, string, string]>> = {
  en: {
    nights: ["0 nights", "1 night", "2 nights"],
    guests: ["0 guests", "1 guest", "2 guests"],
    adults: ["0 adults", "1 adult", "2 adults"],
    children: ["0 children", "1 child", "2 children"],
  },
  yo: {
    nights: ["alẹ́ 0", "alẹ́ 1", "alẹ́ 2"],
    guests: ["àlejò 0", "àlejò 1", "àlejò 2"],
    adults: ["àgbàlagbà 0", "àgbàlagbà 1", "àgbàlagbà 2"],
    children: ["ọmọdé 0", "ọmọdé 1", "ọmọdé 2"],
  },
  ha: {
    nights: ["darare 0", "dare ɗaya", "darare 2"],
    guests: ["baƙi 0", "baƙo ɗaya", "baƙi 2"],
    adults: ["manya 0", "babba ɗaya", "manya 2"],
    children: ["yara 0", "yaro ɗaya", "yara 2"],
  },
  ig: {
    nights: ["abalị 0", "abalị 1", "abalị 2"],
    guests: ["ọbịa 0", "ọbịa 1", "ọbịa 2"],
    adults: ["okenye 0", "okenye 1", "okenye 2"],
    children: ["nwa 0", "nwa 1", "nwa 2"],
  },
};

describe("the plural categories come from the locale, not from an assumption", () => {
  it("gives English and Hausa two categories and Yoruba and Igbo one", () => {
    /* If this ever fails, the runtime's CLDR data changed and the dictionary
       entries below need revisiting before the expectations are edited. Do not
       simply update the numbers: a locale that gains a category has locale
       files carrying a form that is no longer reachable. */
    const categories = (locale: Locale) =>
      new Intl.PluralRules(intlTag[locale]).resolvedOptions().pluralCategories.slice().sort();

    expect(categories("en")).toEqual(["one", "other"]);
    expect(categories("ha")).toEqual(["one", "other"]);
    expect(categories("yo")).toEqual(["other"]);
    expect(categories("ig")).toEqual(["other"]);
  });
});

describe.each(LOCALES)("plural in %s", (locale) => {
  const counts = getDictionary(locale).counts;

  it.each(["nights", "guests", "adults", "children"] as const)(
    "renders 0, 1 and 2 %s correctly",
    (noun) => {
      const [zero, one, two] = EXPECTED[locale][noun];
      expect(plural(0, counts[noun], locale)).toBe(zero);
      expect(plural(1, counts[noun], locale)).toBe(one);
      expect(plural(2, counts[noun], locale)).toBe(two);
    },
  );

  it("never leaves a {count} placeholder behind", () => {
    for (const noun of ["nights", "guests", "adults", "children"] as const) {
      for (const n of [0, 1, 2, 11, 21, 100]) {
        expect(plural(n, counts[noun], locale)).not.toContain("{count}");
      }
    }
  });
});

describe.each(LOCALES)("formatParty in %s", (locale) => {
  const counts = getDictionary(locale).counts;

  it("states the adults alone when there are no children", () => {
    /* "2 adults, 0 children" is noise on a card whose job is to be read at a
       glance, and the absence of children is not information anybody is
       looking for. */
    expect(formatParty(1, 0, counts, locale)).toBe(EXPECTED[locale].adults[1]);
    expect(formatParty(2, 0, counts, locale)).toBe(EXPECTED[locale].adults[2]);
  });

  it("states both halves when there are children, each in its own form", () => {
    /* The exact shape of the reported bug: one adult and one child used to
       render as "1 adults, 1 children". */
    expect(formatParty(1, 1, counts, locale)).toBe(
      `${EXPECTED[locale].adults[1]}, ${EXPECTED[locale].children[1]}`,
    );
    expect(formatParty(2, 2, counts, locale)).toBe(
      `${EXPECTED[locale].adults[2]}, ${EXPECTED[locale].children[2]}`,
    );
  });

  it("treats a negative child count as no children rather than rendering it", () => {
    expect(formatParty(2, -1, counts, locale)).toBe(EXPECTED[locale].adults[2]);
  });
});

describe("a form the dictionary has not filled in falls back to other", () => {
  it("uses other rather than rendering nothing", () => {
    /* Not a shape any locale file ships, but the type allows every category
       except `other` to be absent, so the fallback has to be real. */
    expect(plural(1, { other: "{count} things" }, "en")).toBe("1 things");
  });
});
