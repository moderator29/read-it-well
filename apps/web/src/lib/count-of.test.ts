import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, countOf, getDictionary, type UnitNoun } from "@vallo/i18n";

/**
 * The counted phrases components used to inflect by hand, now read from the
 * dictionary's `units` table in every locale.
 *
 * The expectations are written out, not read back from the dictionary, so a
 * reader can see what a page shows. Three things are pinned:
 *
 *   - every locale answers every unit with an `other` form, so no count ever
 *     renders an empty span or a raw key;
 *   - a unit the locale has translated takes the locale's own categories
 *     (Yoruba and Igbo have one, Hausa two);
 *   - a unit it has NOT translated is English text, and takes English's
 *     categories: "1 bed" on a Yoruba page, never the "1 beds" Yoruba's single
 *     category would pick from an English pair.
 */

const NOUNS = Object.keys(getDictionary("en").units) as UnitNoun[];

describe("countOf", () => {
  it("has a form for every unit in every locale, and never leaves the placeholder behind", () => {
    expect(NOUNS.length).toBeGreaterThan(60);
    for (const locale of LOCALES) {
      const units = getDictionary(locale).units;
      for (const noun of NOUNS) {
        expect(typeof units[noun]?.other, `${locale} ${noun}`).toBe("string");
        for (const n of [0, 1, 2, 21, 1500]) {
          expect(countOf(n, noun, locale), `${locale} ${noun} ${n}`).not.toContain("{count}");
        }
      }
    }
  });

  it("inflects English by count", () => {
    expect([0, 1, 2].map((n) => countOf(n, "beds", "en"))).toEqual(["0 beds", "1 bed", "2 beds"]);
    expect(countOf(1, "reportsWaiting", "en")).toBe("1 report has");
    expect(countOf(3, "reportsWaiting", "en")).toBe("3 reports have");
    expect(countOf(1, "daysAgo", "en")).toBe("yesterday");
    expect(countOf(4, "daysAgo", "en")).toBe("4 days ago");
    expect(countOf(1500, "nights", "en")).toBe("1,500 nights");
  });

  it("agrees the verb with the number that is trading, not with the set", () => {
    expect(countOf(1, "businessesStillTrading", "en")).toBe("1 of your businesses is still trading.");
    expect(countOf(2, "businessesStillTrading", "en")).toBe("2 of your businesses are still trading.");
  });

  it("uses the locale's own forms where it has translated the unit", () => {
    expect([0, 1, 2].map((n) => countOf(n, "nights", "yo"))).toEqual(["alẹ́ 0", "alẹ́ 1", "alẹ́ 2"]);
    expect([0, 1, 2].map((n) => countOf(n, "nights", "ha"))).toEqual(["darare 0", "dare ɗaya", "darare 2"]);
    expect([0, 1, 2].map((n) => countOf(n, "guests", "ig"))).toEqual(["ọbịa 0", "ọbịa 1", "ọbịa 2"]);
  });

  it("keeps English grammar for a unit the locale still shows in English", () => {
    for (const locale of ["yo", "ig", "ha"] as const) {
      expect([0, 1, 2].map((n) => countOf(n, "beds", locale)), locale).toEqual(["0 beds", "1 bed", "2 beds"]);
    }
  });
});

/*
 * THE UNITS TABLE IS READ THROUGH countOf, NEVER HANDED TO plural().
 *
 * `plural(n, t.units.beds, locale)` picks the form by the page's locale, and
 * Yoruba and Igbo have one category, so an untranslated English pair printed
 * "1 beds · 1 baths" on every one-bedroom card and listing page in those two
 * languages (Track M QA, 25 September 2026). `countOf` is the door that knows
 * an untranslated unit is English and takes English's categories.
 *
 * The two files left are the move-in ledger, a money screen whose owner
 * changes it; the list may only shrink.
 */
const SRC = join(__dirname, "..");
const NOT_YET = new Set([
  "app/(app)/rent/move-in/[listingId]/MoveInLedger.tsx",
  "app/(app)/rent/move-in/[listingId]/page.tsx",
]);

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "(dev)" && name !== "node_modules") sources(path, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe("the units table", () => {
  it("reaches the page through countOf", () => {
    const handed = sources(SRC)
      .filter((file) => /\bplural\([^,()]+,\s*[\w.]*\bunits\./.test(readFileSync(file, "utf8")))
      .map((file) => relative(SRC, file))
      .sort();
    expect(handed).toEqual([...NOT_YET].sort());
  });
});
