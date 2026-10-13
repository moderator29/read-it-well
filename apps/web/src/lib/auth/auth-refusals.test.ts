import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

/**
 * ERRORS THAT NAME THE NEXT ACTION (U1, 6 October). The refusals the auth
 * screens show come from the dictionary, each says what went wrong and the
 * one thing to do next, and a refused code is honest about what the server
 * knows: the whole code was refused, not a digit.
 */
const en = getDictionary("en");
const refusals = en.experienceEntry.refusals;

describe("auth refusals", () => {
  it("never say invalid credentials, and each ends on something to do", () => {
    const doors = en.publicDoors;
    const all = {
      ...refusals,
      emailWrongCode: doors.emailCode.wrongCode,
      emailVerifyLimited: doors.emailCode.verifyLimited,
      phoneWrongCode: doors.phone.wrongCode,
      phoneVerifyLimited: doors.phone.verifyLimited,
    };
    for (const [key, text] of Object.entries(all)) {
      expect(text, key).not.toMatch(/invalid credentials|invalid login|error code/i);
      /* What to do: an imperative the person can act on, or the promise of
         what happens next for the neutral "on its way" answers. */
      expect(text, key).toMatch(
        /\b(Enter|Type|Try|Check|Use|Wait|Ask|Sign in|Confirm|Open|reset|on its way)\b/,
      );
    }
  });

  it("refuse a code as a whole, and say the last try is selected for typing again", () => {
    for (const text of [refusals.codeWrong, en.publicDoors.emailCode.wrongCode, en.publicDoors.phone.wrongCode]) {
      expect(text).toMatch(/^That code did not work\./);
      expect(text).toMatch(/selected, so typing replaces it\.$/);
      expect(text).not.toMatch(/digit (\d|one|two|three|four|five|six)\b|wrong digit|the (first|last) digit/i);
    }
  });

  it("say the check's limit, not the send's, when the code has been tried too often", () => {
    expect(en.publicDoors.emailCode.verifyLimited).not.toBe(en.publicDoors.emailCode.limited);
    expect(readFileSync(join(__dirname, "../../components/auth/CodeSignInForm.tsx"), "utf8")).toMatch(
      /onCode && state\.error === "limited"\s*\?\s*copy\.verifyLimited/,
    );
  });

  it("come from the dictionary in the actions, not from English in the code", () => {
    const actions = readFileSync(join(__dirname, "actions.ts"), "utf8");
    for (const sentence of Object.values(refusals)) {
      const literal = sentence.split("{")[0]!.slice(0, 40);
      expect(actions, sentence).not.toContain(`"${literal}`);
    }
    expect(actions).toMatch(/fieldErrors: \{ code: w\.codeWrong \}/);
    expect(actions).not.toMatch(/That code did not match/);
  });
});
