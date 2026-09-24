import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary } from "@vallo/i18n";

/**
 * The sign-in notice is chosen by `?notice=` from the URL. A plain index
 * would let `?notice=constructor` or `?notice=toString` reach the object
 * prototype and print a function's source as the notice. Only the table's
 * own keys may answer.
 */
describe("the sign-in notice lookup", () => {
  it("answers only for the table's own keys", () => {
    const page = readFileSync(join(__dirname, "page.tsx"), "utf8");
    expect(page).toContain("Object.hasOwn(t.authFlow.notices, notice)");
    for (const locale of LOCALES) {
      const notices = getDictionary(locale).authFlow.notices;
      for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
        expect(Object.hasOwn(notices, key), `${locale} ${key}`).toBe(false);
      }
      expect(typeof notices["link-expired"]).toBe("string");
    }
  });
});
