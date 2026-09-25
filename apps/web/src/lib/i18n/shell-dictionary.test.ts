import { describe, expect, it } from "vitest";
import { getDictionary, LOCALES } from "@vallo/i18n";
import { shellDictionary } from "./shell-dictionary";

/*
 * What the shell reads is enforced by the compiler: `AppShell` and every
 * component it hands `t` to take a `ShellDictionary`, so a read that is not
 * carried does not build. These hold the other side of the bargain: the
 * shell carries the reader's own words, and stays small.
 */
describe("the shell's slice of the dictionary", () => {
  it.each(LOCALES)("%s is the reader's own words, taken from their dictionary", (locale) => {
    const t = getDictionary(locale);
    const shell = shellDictionary(t);
    expect(shell.nav).toBe(t.nav);
    expect(shell.side).toBe(t.side);
    expect(shell.shape.plans).toBe(t.shape.plans);
    expect(shell.supply.kinds).toBe(t.supply.kinds);
    expect(shell.priceCheck.title).toBe(t.priceCheck.title);
  });

  it.each(LOCALES)("%s stays under 8 KB (it was 58 KB of whole namespaces)", (locale) => {
    expect(JSON.stringify(shellDictionary(getDictionary(locale))).length).toBeLessThan(8_000);
  });

  it("is built once per dictionary, so a page never serialises two copies", () => {
    const t = getDictionary("en");
    expect(shellDictionary(t)).toBe(shellDictionary(t));
  });
});
