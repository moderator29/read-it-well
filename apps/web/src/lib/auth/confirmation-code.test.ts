import { describe, expect, it } from "vitest";
import {
  CONFIRMATION_CODE_LENGTH,
  CONFIRMATION_CODE_PLACEHOLDER,
  CONFIRMATION_CODE_RE,
  codeLengthWord,
  readCode,
  surplusMessage,
} from "./confirmation-code";

/*
 * THE DEFECT THESE TESTS EXIST FOR. The length six was written out in four
 * places: this regex, two sentences of copy, and the input's truncation. The
 * Supabase project was then set to issue eight, the field cut the last two
 * digits off without a word, the server refused the six that survived, and the
 * screen told somebody their code was wrong while they were looking at the
 * right code in their email.
 *
 * So there are two things to hold. Every derived value must follow the
 * constant rather than repeat it, which is what catches the NEXT length change.
 * And a surplus must be reported rather than eaten, which is what makes that
 * change survivable while somebody is signing up.
 */

describe("everything derives from the one constant", () => {
  it("builds a regex of exactly that many digits", () => {
    const right = "1".repeat(CONFIRMATION_CODE_LENGTH);
    expect(CONFIRMATION_CODE_RE.test(right)).toBe(true);
    expect(CONFIRMATION_CODE_RE.test(right.slice(1))).toBe(false);
    expect(CONFIRMATION_CODE_RE.test(`${right}1`)).toBe(false);
  });

  it("refuses anything that is not digits, however long", () => {
    const pad = "1".repeat(CONFIRMATION_CODE_LENGTH - 1);
    expect(CONFIRMATION_CODE_RE.test(`${pad}a`)).toBe(false);
    expect(CONFIRMATION_CODE_RE.test(`${pad} `)).toBe(false);
    expect(CONFIRMATION_CODE_RE.test("")).toBe(false);
  });

  it("builds a placeholder of exactly that many digits", () => {
    expect(CONFIRMATION_CODE_PLACEHOLDER).toHaveLength(CONFIRMATION_CODE_LENGTH);
    expect(CONFIRMATION_CODE_RE.test(CONFIRMATION_CODE_PLACEHOLDER)).toBe(true);
  });

  it("spells the number out for the copy, and falls back to the numeral", () => {
    expect(codeLengthWord(6)).toBe("six");
    expect(codeLengthWord(8)).toBe("eight");
    // Outside the range a one-time code plausibly takes. "12 digits" is honest.
    expect(codeLengthWord(12)).toBe("12");
  });

  it("gives the copy a word for whatever the constant is set to", () => {
    expect(codeLengthWord()).toBe(codeLengthWord(CONFIRMATION_CODE_LENGTH));
    expect(codeLengthWord()).not.toBe("");
  });
});

describe("reading what somebody typed", () => {
  const full = "1".repeat(CONFIRMATION_CODE_LENGTH);

  it("drops the spacing a mail client brings, and nothing else", () => {
    const spaced = `  ${full.slice(0, 3)} ${full.slice(3)} `;
    expect(readCode(spaced).digits).toBe(full);
    expect(readCode(`${full.slice(0, 3)}-${full.slice(3)}`).digits).toBe(full);
  });

  it("calls the right length complete and a short one not", () => {
    expect(readCode(full).complete).toBe(true);
    expect(readCode(full.slice(1)).complete).toBe(false);
  });

  it("NEVER truncates: every surplus digit survives the read", () => {
    const tooMany = `${full}99`;
    const reading = readCode(tooMany);
    expect(reading.digits).toBe(tooMany);
    expect(reading.digits).toHaveLength(CONFIRMATION_CODE_LENGTH + 2);
    expect(reading.surplus).toBe(2);
    // And it must not submit itself, which is what sent the truncated value.
    expect(reading.complete).toBe(false);
  });

  it("says so, naming both numbers, when there are too many", () => {
    const message = surplusMessage(readCode(`${full}99`));
    expect(message).toContain(String(CONFIRMATION_CODE_LENGTH + 2));
    expect(message).toContain(codeLengthWord());
  });

  it("says nothing when the count is right or still short", () => {
    expect(surplusMessage(readCode(full))).toBeNull();
    expect(surplusMessage(readCode(full.slice(1)))).toBeNull();
    expect(surplusMessage(readCode(""))).toBeNull();
  });
});
