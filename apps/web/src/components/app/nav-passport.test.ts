import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { shellDictionary } from "@/lib/i18n/shell-dictionary";
import { buildNav } from "./nav-model";

/*
 * THE SIDE MENU'S PASSPORT ROW CARRIES THE PASSPORT'S CURRENT NAME, in every
 * language, and opens the passport page. It used to read "Space Passport" from
 * an English-only line in the shell's own copy; the name now comes from
 * `passportV2.navLabel`, the same word the page and its first run use, so the
 * row and the page cannot drift and the three other languages are translated.
 */
const LOCALES = ["en", "yo", "ig", "ha"] as const;

describe("the side navigation's passport row", () => {
  for (const locale of LOCALES) {
    for (const side of ["property", "stays"] as const) {
      it(`names the Vallo passport and opens its page (${locale}, ${side} side)`, () => {
        const dictionary = getDictionary(locale);
        const sections = buildNav({
          t: shellDictionary(dictionary),
          side,
          signedIn: true,
          unreadNotifications: 0,
          isAgent: false,
          isAdmin: false,
        });
        const row = sections.flatMap((s) => s.items).find((i) => i.href === "/settings/passport");
        expect(row?.label).toBe(dictionary.passportV2.navLabel);
        expect(row?.label).not.toMatch(/space/i);
      });
    }
  }

  it("is not the English word in the other three languages", () => {
    const english = getDictionary("en").passportV2.navLabel;
    for (const locale of ["yo", "ig", "ha"] as const) {
      expect(getDictionary(locale).passportV2.navLabel).not.toBe(english);
    }
  });
});

describe("no old name is left in the copy", () => {
  it("never calls the passport the Space Passport in any language", () => {
    for (const locale of LOCALES) {
      expect(JSON.stringify(getDictionary(locale))).not.toMatch(/space passport/i);
    }
  });
});

describe("the old passport rules are gone from the copy", () => {
  const OLD_RULES = [
    /only in the conversations you choose/i,
    /shown only in the conversations/i,
    /off until you turn it on/i,
    /no lister may ask/i,
    /what a lister would see/i,
    /renter passport/i,
  ];

  it("says none of them anywhere in English", () => {
    const text = JSON.stringify(getDictionary("en"));
    for (const rule of OLD_RULES) expect(text).not.toMatch(rule);
  });

  it("states the new model in the passport section of every language: members only, hide any line, never phone, email, ID, birth date or address", () => {
    const english = getDictionary("en").trustVisible.passport;
    expect(english.lede).toMatch(/on by default/i);
    expect(english.lede).toMatch(/signed-in members/i);
    expect(english.lede).toMatch(/hide any line/i);
    expect(english.lede).toMatch(/phone number, email, ID numbers, date of birth and address are never on it/i);
    for (const locale of ["yo", "ig", "ha"] as const) {
      const copy = getDictionary(locale).trustVisible.passport;
      /* Translated, not English left in place. */
      expect(copy.lede).not.toBe(english.lede);
      expect(copy.title).not.toBe(english.title);
      expect(copy.preview).not.toBe(english.preview);
      expect(copy.offNote).not.toBe(english.offNote);
    }
  });
});
