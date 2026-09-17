import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * NO LETTER FROM AN ALPHABET THESE LANGUAGES DO NOT USE.
 *
 * ---------------------------------------------------------------------------
 * THIS EXISTS BECAUSE IT ALREADY HAPPENED, in applicant-facing Hausa.
 *
 * Somebody writing `buƙatar` reached for the hooked k and typed `ҳ`, U+04B3,
 * CYRILLIC SMALL LETTER HA WITH DESCENDER, instead of `ƙ`, U+0199. Four
 * characters, across three words, on the verification screen an agent reads
 * when we have stopped them from earning.
 *
 * It compiled. Every test passed. It looked plausible at a glance. It was
 * caught only because the person who wrote it printed the block back and read
 * it, and they said plainly that we should assume there is more they did not
 * catch. Every Yoruba, Hausa and Igbo string in this product was written by a
 * model and none has been read by a speaker, so "somebody will notice" is not
 * a defence that is available here.
 *
 * WHAT THIS CAN AND CANNOT DO. It cannot tell you the grammar is right, the
 * register is right, or the word is the one a person would use. It can tell you
 * the characters come from the right alphabet, which is the one part of the
 * problem a machine can hold. That is a small guarantee and it is strictly more
 * than none.
 *
 * WHAT IS ALLOWED, and why each one:
 *   ASCII                      the base
 *   Latin-1 Supplement         accented vowels
 *   Latin Extended-A and B     ƙ U+0199 and ƴ U+01B4, Hausa hooked letters
 *   IPA Extensions             ɓ U+0253 and ɗ U+0257, the other two
 *   Combining Diacriticals     Yoruba tone marks, which stack
 *   Latin Extended Additional  ẹ ọ ṣ ị ụ, the Yoruba and Igbo dotted vowels
 *   the naira sign, curly quotes, the ellipsis and the arrow
 *
 * Anything else is a character from somewhere else, and on this evidence that
 * means a mistake rather than a decision.
 */
const ALLOWED: ReadonlyArray<readonly [number, number]> = [
  [0x0020, 0x024f],
  [0x0250, 0x02af],
  [0x0300, 0x036f],
  [0x1e00, 0x1eff],
];
const ALLOWED_SINGLES = new Set([0x20a6, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2192, 0x000a]);

function offences(source: string): string[] {
  const out: string[] = [];
  source.split("\n").forEach((line, i) => {
    for (const ch of line) {
      const code = ch.codePointAt(0) ?? 0;
      if (ALLOWED_SINGLES.has(code)) continue;
      if (ALLOWED.some(([lo, hi]) => code >= lo && code <= hi)) continue;
      out.push(`line ${i + 1}: U+${code.toString(16).toUpperCase().padStart(4, "0")} ${JSON.stringify(ch)}`);
    }
  });
  return out;
}

/* The locale files, from the app. `banned-phrases.test.ts` reaches the same
   directory the same way and for the same reason: the guards that matter to the
   product live with the product, and the suite only walks `apps/web/src`. */
const DIR = join(import.meta.dirname ?? __dirname, "../../../../../packages/i18n/src/locales");

describe("every locale uses only its own alphabet", () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

  it("finds the locale files", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    it(`${file} has no character from another alphabet`, () => {
      expect(offences(readFileSync(join(DIR, file), "utf8"))).toEqual([]);
    });
  }

  it("catches the exact character that got through", () => {
    /* U+04B3, the Cyrillic ha with descender that was typed for a hooked k. */
    expect(offences('buҳatar')).toHaveLength(1);
    /* And passes the letter it was mistaken for. */
    expect(offences("buƙatar")).toEqual([]);
  });

  it("passes the four Hausa hooked letters and the Yoruba dotted vowels", () => {
    expect(offences("ɓ ɗ ƙ ƴ Ɓ Ɗ Ƙ Ƴ ẹ ọ ṣ ị ụ àáèé")).toEqual([]);
  });
});
