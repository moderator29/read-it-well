import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { attemptsLeft } from "@/lib/passcode/rules";
import { wrongCodeMessage } from "./wrong-message";

const copy = getDictionary("en").passcode;

describe("what a wrong passcode says", () => {
  it("says only that it was wrong while more than one try is left", () => {
    expect(wrongCodeMessage({ beforeCooldown: 4, beforeSignOut: 9 }, copy, "en")).toBe(copy.wrong);
    expect(wrongCodeMessage({ beforeCooldown: 2, beforeSignOut: 7 }, copy, "en")).toBe(copy.wrong);
    expect(wrongCodeMessage({ beforeCooldown: 4, beforeSignOut: 4 }, copy, "en")).toBe(copy.wrong);
  });

  it("names the pause when exactly one try is left before it", () => {
    expect(wrongCodeMessage({ beforeCooldown: 1, beforeSignOut: 6 }, copy, "en")).toBe(copy.wrongLeft.one);
  });

  it("names the sign-out when exactly one try is left before it", () => {
    expect(wrongCodeMessage({ beforeCooldown: 1, beforeSignOut: 1 }, copy, "en")).toBe(copy.wrongLastBeforeSignOut.one);
  });

  it("never prints a count bigger than one, across a whole run of wrong tries", () => {
    for (let failed = 1; failed < 10; failed += 1) {
      const message = wrongCodeMessage(attemptsLeft(failed), copy, "en");
      expect(message).not.toMatch(/[2-9] more/);
    }
  });
});
