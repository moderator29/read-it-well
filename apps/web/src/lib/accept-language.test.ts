import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  localeFromAcceptLanguage,
  matchAcceptLanguage,
  parseAcceptLanguage,
} from "@vallo/i18n";

/**
 * `Accept-Language` negotiation.
 *
 * The functions under test live in `packages/i18n`, not in this app. They are
 * tested from here because this is the only vitest project in the repository
 * and because `lib/locale.ts`, the thing that actually consumes them, cannot be
 * imported outside a request: it opens with `import "server-only"` and calls
 * `next/headers`. Splitting the parsing out of that module is exactly what made
 * it testable at all, and these are the tests that split was for.
 *
 * What this guards is not a formatting nicety. Until this landed, a first-time
 * visitor whose phone is set to Yoruba, Hausa or Igbo was served English, which
 * meant three of the four translations the platform ships were unreachable
 * without finding the language switcher first.
 */

describe("parseAcceptLanguage", () => {
  it("returns nothing for an absent, empty or whitespace header", () => {
    expect(parseAcceptLanguage(undefined)).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage("")).toEqual([]);
    expect(parseAcceptLanguage("   ")).toEqual([]);
  });

  it("reads a single bare tag at the default weight of 1", () => {
    expect(parseAcceptLanguage("yo")).toEqual([{ tag: "yo", quality: 1 }]);
  });

  it("lowercases the tag and keeps the region subtag", () => {
    expect(parseAcceptLanguage("yo-NG")).toEqual([{ tag: "yo-ng", quality: 1 }]);
  });

  it("orders by weight, strongest first", () => {
    expect(parseAcceptLanguage("fr;q=0.5,ha;q=0.9,de;q=0.1")).toEqual([
      { tag: "ha", quality: 0.9 },
      { tag: "fr", quality: 0.5 },
      { tag: "de", quality: 0.1 },
    ]);
  });

  it("keeps the written order when two ranges carry the same weight", () => {
    /* `en, yo` and `yo, en` mean different things and both are legal, so the
       sort has to be stable rather than merely correct about the numbers. */
    expect(parseAcceptLanguage("en,yo").map((r) => r.tag)).toEqual(["en", "yo"]);
    expect(parseAcceptLanguage("yo,en").map((r) => r.tag)).toEqual(["yo", "en"]);
  });

  it("drops a range the client weighted at zero", () => {
    /* q=0 is not "no opinion", it is the client saying explicitly that it does
       not want that language. Treating it as a candidate inverts the request. */
    expect(parseAcceptLanguage("ig;q=0,en;q=0.4")).toEqual([{ tag: "en", quality: 0.4 }]);
  });

  it("clamps a weight above 1 rather than letting it outrank everything", () => {
    expect(parseAcceptLanguage("ha;q=7,en")).toEqual([
      { tag: "ha", quality: 1 },
      { tag: "en", quality: 1 },
    ]);
  });

  it("does not throw on a malformed header, and returns only what it could read", () => {
    expect(() => parseAcceptLanguage(";;;,,,q=")).not.toThrow();
    expect(parseAcceptLanguage(";;;,,,q=")).toEqual([]);
    expect(() => parseAcceptLanguage("*/*; q=nonsense; charset=utf-8")).not.toThrow();
    expect(() => parseAcceptLanguage("en-US,,;q=,ha")).not.toThrow();
    expect(parseAcceptLanguage("en-US,,;q=,ha").map((r) => r.tag)).toEqual(["en-us", "ha"]);
  });
});

describe("matchAcceptLanguage", () => {
  it("matches a bare supported tag", () => {
    expect(matchAcceptLanguage("yo", LOCALES)).toBe("yo");
  });

  it("matches a regional tag on its primary subtag, case insensitively", () => {
    expect(matchAcceptLanguage("yo-NG", LOCALES)).toBe("yo");
    expect(matchAcceptLanguage("HA-Latn-NG", LOCALES)).toBe("ha");
    expect(matchAcceptLanguage("IG", LOCALES)).toBe("ig");
  });

  it("takes the strongest supported range, not the first written one", () => {
    /* The realistic shape of this: a browser set to French with Igbo second.
       Nothing we ship is French, so the answer is Igbo rather than English. */
    expect(matchAcceptLanguage("fr-FR,fr;q=0.9,ig;q=0.7", LOCALES)).toBe("ig");
    expect(matchAcceptLanguage("en;q=0.3,ha;q=0.8", LOCALES)).toBe("ha");
  });

  it("returns null when nothing asked for is supported", () => {
    expect(matchAcceptLanguage("fr-FR,fr;q=0.9,de;q=0.8", LOCALES)).toBeNull();
  });

  it("does not treat the wildcard as a match", () => {
    /* `*` means "anything will do". Deciding what to do when nothing is
       preferred belongs to the caller's default, not to this function. */
    expect(matchAcceptLanguage("*", LOCALES)).toBeNull();
    expect(matchAcceptLanguage("fr,*;q=0.5,ha;q=0.2", LOCALES)).toBe("ha");
  });
});

describe("localeFromAcceptLanguage, which is what the resolver calls", () => {
  it("resolves the four locales the platform ships", () => {
    expect(localeFromAcceptLanguage("en-GB,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("yo-NG,yo;q=0.9,en;q=0.5")).toBe("yo");
    expect(localeFromAcceptLanguage("ha-NG")).toBe("ha");
    expect(localeFromAcceptLanguage("ig-NG,ig;q=0.8")).toBe("ig");
  });

  it("returns null for an unsupported language, so the caller falls to English", () => {
    const negotiated = localeFromAcceptLanguage("fr-FR,fr;q=0.9,es;q=0.8");
    expect(negotiated).toBeNull();
    expect(negotiated ?? DEFAULT_LOCALE).toBe("en");
  });

  it("returns null for an absent header, so the caller falls to English", () => {
    expect(localeFromAcceptLanguage(null) ?? DEFAULT_LOCALE).toBe("en");
    expect(localeFromAcceptLanguage(undefined) ?? DEFAULT_LOCALE).toBe("en");
  });
});
