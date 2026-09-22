/**
 * HOW LONG A CONFIRMATION CODE IS, IN ONE PLACE.
 *
 * THE DEFECT THIS EXISTS TO END. The length six was written out in four
 * places: the regex the server validates against, two sentences of copy either
 * side of it, and the input's own truncation. Supabase was then configured to
 * issue EIGHT. The field silently cut the last two digits off, the server
 * refused the six it was handed, and the person was told their code was wrong
 * while looking at the correct code in their email. Every layer behaved exactly
 * as written and the product lied.
 *
 * The truncation is the part worth dwelling on. `slice(0, 6)` on a pasted
 * value is a decision to DISCARD what somebody gave us and say nothing, and it
 * is only ever right when the surplus is meaningless. Here the surplus WAS the
 * code. A silent trim turns a recoverable mismatch, where the person can see
 * that what they typed is not what they were sent, into an unrecoverable one
 * where the screen agrees with them and still refuses. So this module also
 * carries the reading helper, and it reports a surplus rather than eating it.
 *
 * WHY IT IS ITS OWN MODULE AND NOT A CONSTANT IN `actions.ts`. That file is a
 * `"use server"` module, and such a module may export NOTHING that is not an
 * async function. It may declare types and it may import whatever it likes,
 * but a constant exported from it is refused by the bundler, and a re-export
 * statement there took the whole build down twice: once on 19 September and
 * again on 22 September, the second time stripping every export from the
 * module and failing nine consumers with fifty eight errors. So the shared
 * fact lives in an ordinary module that both the server action and the client
 * component import.
 *
 * IF SUPABASE'S LENGTH CHANGES, CHANGE IT HERE AND ONLY HERE. The regex, both
 * sentences of copy, the placeholder and the input all read from it.
 */

/**
 * The number of digits in a confirmation code.
 *
 * It must match the project's Auth setting in the Supabase dashboard. That
 * setting is the source of truth because it is what actually generates the
 * code; this is the only copy of it in the application, so the two can
 * disagree in exactly one place rather than in four.
 */
export const CONFIRMATION_CODE_LENGTH = 6;

/**
 * Built from the length rather than typed beside it, which is the whole point.
 * A literal `\d{6}` here is a fifth copy waiting to be missed.
 */
export const CONFIRMATION_CODE_RE = new RegExp(`^\\d{${CONFIRMATION_CODE_LENGTH}}$`);

/** "123456" at the configured length, for the field's placeholder. */
export const CONFIRMATION_CODE_PLACEHOLDER = Array.from(
  { length: CONFIRMATION_CODE_LENGTH },
  (_, i) => String((i + 1) % 10),
).join("");

/*
 * The words, because the copy says "six digits" and not "6 digits".
 *
 * Spelling a small number out is the house voice and it reads better in a
 * sentence, but it is also how the copy drifted from the regex in the first
 * place: nobody greps for the word "six" when they change a number. Deriving
 * the word from the number means the sentence cannot be left behind.
 *
 * Only the lengths a one-time code plausibly takes are here. Anything outside
 * that range falls back to the numeral, which is correct rather than clever: a
 * sentence reading "12 digits" is fine, and inventing a word list up to twenty
 * for a case that will never happen is not.
 */
const WORDS: Readonly<Record<number, string>> = {
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
};

/** "six" for 6, "eight" for 8, "12" for anything outside the plausible range. */
export function codeLengthWord(length: number = CONFIRMATION_CODE_LENGTH): string {
  return WORDS[length] ?? String(length);
}

/** The result of reading whatever a person typed or pasted into the field. */
export type CodeReading = {
  /** Every digit they gave us, in order. NEVER truncated. */
  digits: string;
  /** True once there are exactly as many digits as a code has. */
  complete: boolean;
  /**
   * How many digits beyond the expected length they gave us, or zero. This is
   * the number the old code threw away.
   */
  surplus: number;
};

/**
 * Read a typed or pasted value into digits, WITHOUT DISCARDING ANY OF THEM.
 *
 * Non-digits are dropped, because "  123 456 " and "123-456" are both somebody
 * pasting a code out of an email and the spacing is not part of what they
 * meant. Digits are never dropped, because the whole defect was that they
 * were.
 */
export function readCode(value: string): CodeReading {
  const digits = value.replace(/\D/g, "");
  return {
    digits,
    complete: digits.length === CONFIRMATION_CODE_LENGTH,
    surplus: Math.max(0, digits.length - CONFIRMATION_CODE_LENGTH),
  };
}

/**
 * What to say when somebody has given us more digits than a code has.
 *
 * It names BOTH numbers, because the person is looking at their own code and
 * needs to know whether the mismatch is theirs or ours. "That is eight digits
 * and the code is six" lets them recount; "wrong code" does not.
 */
export function surplusMessage(reading: CodeReading): string | null {
  if (reading.surplus === 0) return null;
  return `That is ${reading.digits.length} digits. The code is ${codeLengthWord()}, so check for an extra one.`;
}
