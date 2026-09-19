import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BANNED_IN_EXAMPLE_COPY,
  BANNED_SYNONYMS,
  SCHEDULE_PROMISES,
  UNREAL_WORDS,
  firstBannedPhrase,
} from "./banned-phrases";
import { stringLiterals, withoutComments } from "./source-scan";

/**
 * THE GUARD THAT WOULD HAVE CAUGHT F2-003.
 *
 * `docs/PRODUCT.md` section 7 says the copy ban is "enforced by five specs".
 * It was, and all five were looking at the wrong surfaces: thirteen screens
 * said a feature "switches on shortly", six more promised it "the moment the
 * platform keys land", two told a reader to "check back soon", and every one
 * of the five specs passed while they did.
 *
 * Two things are proved below. The vocabulary catches the exact sentences that
 * shipped, each one written out here so a future edit to the patterns cannot
 * quietly stop catching the thing they exist for. And the sweep reads every
 * source file in the app, so the next synonym is caught wherever it is written
 * rather than only on the five surfaces somebody remembered.
 */

const SRC = join(process.cwd(), "src");

/** The sentences that were actually live, verbatim, one per finding. */
const THE_STRINGS_THAT_SHIPPED = [
  "Guest reviews of your stays appear here the moment the platform keys land.",
  "Guest enquiries appear here the moment the platform keys land.",
  "Account deletion completes the moment the platform keys land, and nothing has been deleted today.",
  "Messaging opens for this listing the moment it goes live on the platform. Save it and check back soon.",
  "This stay opens for booking as soon as live inventory lands. Save it and check back soon.",
  "Card payment switches on the moment payment keys land.",
  "This feature switches on the moment the platform keys land.",
  "Notifications switch on shortly.",
  "Messaging is nearly here, so come back soon.",
  "Accounts switch on shortly.",
  /*
   * F1-095's other half, which no pattern caught until the shape was banned
   * rather than the sentence. The string was already out of the tree, so the
   * sweep was green either way and the hole was invisible.
   */
  "People switch on shortly. The platform keys are not in place yet.",
  "The platform keys are not in place yet, so there is nothing to show.",
  "We are waiting on the payment keys.",
  /*
   * And the same promise as it shipped in the other three languages, which is
   * where five of these survived a rewrite of their English original. Pinned
   * verbatim: if somebody edits a pattern and these stop matching, the guard
   * has quietly gone back to covering one language out of four.
   */
  "Owó tí o rí máa hàn níbí ní kété tí àwọn kọ́kọ́rọ́ pátákó bá dé.",
  "Àwọn àkàǹtì yóò ṣí ní kété tí àwọn kọ́kọ́rọ́ pátákò bá dé.",
  "Kuɗin da ka samu zai bayyana a nan da zarar maɓallan dandalin suka iso.",
  "Hotuna za su loda idan mabuɗan dandalin suka iso.",
  "Wannan shafin zai nuna takardar neman ka lokacin da makullan dandamali suka iso.",
  "Ego gị ga-apụta ebe a ozugbo igodo nke ikpo okwu rutere.",
  "Foto ga-ebugo ozugbo igodo ikpo okwu rutere.",
];

describe("the banned copy vocabulary", () => {
  it.each(THE_STRINGS_THAT_SHIPPED)("catches %s", (sentence) => {
    expect(firstBannedPhrase(sentence)).not.toBeNull();
  });

  it("catches the phrase the ban is written down as", () => {
    expect(firstBannedPhrase("This feature is coming soon.")).toBe("coming soon");
  });

  /*
   * The line the ban stops at, stated as a test so it is a decision rather
   * than an accident. A present-tense fact about today is allowed; the moment
   * a time is attached to it, it is a promise and it is not.
   */
  it("allows a statement about today that names no date", () => {
    for (const allowed of [
      "Crypto top-ups are not switched on yet. Your balance is untouched and nothing was charged.",
      "Savings pots are not switched on for this account yet. Your balance is untouched.",
      "We cannot reach your wallet right now. Nothing has been lost and nothing has moved.",
      "Your dates stay held and nothing has been charged.",
    ]) {
      expect(firstBannedPhrase(allowed), allowed).toBeNull();
    }
  });

  it("keeps the example-copy words out of the platform-wide sweep", () => {
    /* "preview" is a real thing this product does, so it is banned where
       example content is described and nowhere else. */
    expect(firstBannedPhrase("Tap a photo to preview it.")).toBeNull();
    expect(firstBannedPhrase("Tap a photo to preview it.", UNREAL_WORDS)).toBe("preview");
    expect(BANNED_IN_EXAMPLE_COPY.length).toBe(UNREAL_WORDS.length + SCHEDULE_PROMISES.length);
  });
});

describe("reading a source file the way a reader sees it", () => {
  it("ignores a comment that quotes the sentence it replaced", () => {
    const source = [
      '/* "Payment switches on shortly" was infrastructure jargon. */',
      '// Nor does a line comment about coming soon count.',
      'const body = "Card payment is not available right now.";',
    ].join("\n");
    expect(firstBannedPhrase(withoutComments(source))).toBeNull();
  });

  it("still sees a string literal and JSX text", () => {
    expect(
      firstBannedPhrase(withoutComments('const body = "Payment switches on shortly.";')),
    ).not.toBeNull();
    expect(
      firstBannedPhrase(withoutComments("<p>Your wallet switches on shortly.</p>")),
    ).not.toBeNull();
    expect(
      firstBannedPhrase(withoutComments("const body = `Wallets switch on the moment keys land`;")),
    ).not.toBeNull();
  });

  it("does not mistake a URL or a regular expression for a comment", () => {
    const source = 'const u = "https://vallospaces.com/help"; const re = [/\\bhttps?:\\/\\//i];\nconst after = "coming soon";';
    expect(withoutComments(source)).toContain("https://vallospaces.com/help");
    expect(firstBannedPhrase(withoutComments(source))).toBe("coming soon");
  });

  it("does not swallow the text after a closing JSX tag", () => {
    const source = "<span>One</span>\n<p>This switches on shortly.</p>";
    expect(withoutComments(source)).toContain("This switches on shortly.");
  });

  it("keeps line numbers, so a failure can point at the line", () => {
    const source = "/* one\n   two */\nconst a = 1;";
    expect(withoutComments(source).split("\n").length).toBe(3);
  });
});

/* ------------------------------------------------------------------ the sweep */

/**
 * The vocabulary module and this spec both have to write the banned phrases
 * down to ban them, and a guard that fails on its own definition is a guard
 * nobody keeps.
 */
/*
 * THE DICTIONARY IS WALKED TOO, AND THAT IS THE HALF THAT WAS ACTUALLY ROTTING.
 *
 * `packages/i18n/src` is in the walk. Nine strings in `en.ts` were still in the
 * banned family and are not any more, and behind each of them stood three
 * translations carrying the same promise: 55 strings in total, across four
 * files. Five of the English ones had ALREADY been rewritten in an earlier
 * pass and their Yoruba, Hausa and Igbo twins had not, which is the whole
 * argument for walking the locales rather than trusting that a copy fix
 * travels. It does not travel. Nobody reads the file it fails to travel to.
 */
const EXEMPT = new Set([
  "lib/copy/banned-phrases.ts",
  "lib/copy/banned-phrases.test.ts",
  /*
   * THE RECOVERY DESK, WHERE NAMING THE VARIABLE IS THE POINT.
   *
   * Widening the keys pattern caught three live strings here on its first run,
   * and they are the one place in the product where this is right rather than
   * wrong. `recovery-actions.ts` is the console's money recovery desk: every
   * action in it is behind `requireAdmin()`, and it exists so that the next
   * unposted credit can be fixed "without an engineer, a shell and a service
   * key", in its own words. "Set SUPABASE_SERVICE_ROLE_KEY and try again" is
   * addressed to the person who can do exactly that.
   *
   * THE BAN IS ABOUT AUDIENCE, NOT VOCABULARY. F2-023 and F1-095 are both about
   * our deployment made a CUSTOMER's problem. An operator being told which
   * variable is missing is being given the fix.
   *
   * WHAT THIS COSTS, SAID OUT LOUD: the exemption is the whole file, so a
   * schedule promise written in it would not be caught either. That is the
   * price of a file-level exemption and it is worth naming, because the next
   * person to add a sentence here has no other way to know.
   */
  "lib/wallet/recovery-actions.ts",
]);

/** A path a reader can find, whichever of the two trees it came from. */
function label(path: string): string {
  return path.startsWith(SRC)
    ? relative(SRC, path)
    : `packages/i18n/src/${relative(DICTIONARY, path)}`;
}

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(path, found);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    found.push(path);
  }
  return found;
}

/** The four locale files, which ship the same screens in the other three languages. */
const DICTIONARY = join(process.cwd(), "..", "..", "packages", "i18n", "src");

describe("no screen in this product promises a date it cannot keep", () => {
  const files = [
    ...sourceFiles(SRC).filter((path) => !EXEMPT.has(relative(SRC, path).split("\\").join("/"))),
    ...sourceFiles(DICTIONARY),
  ];

  it("reads a believable number of files, the dictionary among them", () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files.some((path) => path.endsWith("locales/yo.ts"))).toBe(true);
    expect(files.some((path) => path.endsWith("locales/ha.ts"))).toBe(true);
    expect(files.some((path) => path.endsWith("locales/ig.ts"))).toBe(true);
  });

  it("finds no banned schedule promise in any of them", () => {
    const offences: string[] = [];
    for (const path of files) {
      const lines = withoutComments(readFileSync(path, "utf8")).split("\n");
      lines.forEach((text, index) => {
        const phrase = firstBannedPhrase(text);
        if (phrase) {
          offences.push(`${label(path)}:${index + 1}  [${phrase}]  ${text.trim()}`);
        }
      });
    }
    expect(offences, `\n${offences.join("\n")}\n`).toEqual([]);
  });
});

describe("the terminology table is enforced and not just written down", () => {
  /*
   * `PRODUCT.md` section 7 says "Use these words. Do not invent synonyms." and
   * nothing checked. "Round trip" is a fact about a network and is not copy, so
   * the sweep reads string and template literals rather than the whole file:
   * see `stringLiterals` for what that buys and what it costs.
   *
   * SEARCH KEYWORDS ARE EXEMPT, and only search keywords. A person asking the
   * help store about "my trip" must still be matched, because the point of a
   * keyword is to catch the word the reader used, not the word we prefer. What
   * comes back to them is the answer's prose, which is swept like everything
   * else.
   */
  const EXEMPT = new Set([
    "lib/copy/banned-phrases.ts",
    "lib/copy/banned-phrases.test.ts",
    "lib/copy/source-scan.ts",
    "lib/support/faq.ts",
  ]);

  const files = sourceFiles(SRC).filter(
    (path) => !EXEMPT.has(relative(SRC, path).split("\\").join("/")),
  );

  it("uses no banned synonym in any copy the product holds as a string", () => {
    const offences: string[] = [];
    for (const path of files) {
      for (const { line, text } of stringLiterals(readFileSync(path, "utf8"))) {
        for (const { label, pattern, instead } of BANNED_SYNONYMS) {
          if (pattern.test(text)) {
            offences.push(
              `${relative(SRC, path)}:${line}  "${label}" (say "${instead}")  ${text.trim().slice(0, 90)}`,
            );
          }
        }
      }
    }
    expect(offences, `\n${offences.join("\n")}\n`).toEqual([]);
  });
});
