/**
 * THE RULE: the regulated vocabulary may not reach product code.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS BEING PROTECTED.
 *
 * Under the Estate Surveyors and Valuers Act the offence is using any name,
 * title, addition or description IMPLYING authorisation to practise. The
 * offence is in the implication, not in the arithmetic, and Vallo is not on
 * the register. So Price Check reports what places are ASKING, and the
 * regulated nouns appear in exactly one place: the sentence that disclaims
 * them, in `lib/price-check/disclaimer.ts`.
 *
 * Today the tree is already at that line by accident rather than by
 * enforcement. Nothing holds it there. A single future commit writing
 * "Property valuation" into a page title, a push notification, a route
 * segment or an app store listing would be the regulated act, would pass
 * every check in this repository, and would look like a nice piece of copy in
 * review.
 *
 * ---------------------------------------------------------------------------
 * WHY THE RULE IS SPLIT ACROSS TWO FILES, WHICH LOOKS LIKE DUPLICATION.
 *
 * This module is the checker. `apps/web/scripts/check-valuation-words.mjs` is
 * the GATE, and it restates these rules in plain JavaScript rather than
 * importing this file. That is the shape `scripts/check-deep-links.mjs` and
 * `lib/native/deep-link-readiness.ts` already use here, for the reason written
 * in that gate's own header: a build gate that needs a compile step is a build
 * gate that gets taken out of the build the first morning it is in the way.
 *
 * A HAND COPY OF A RULE IS THE THING THAT DRIFTS. So
 * `regulated-words.test.ts` does not assert that the gate exists or that its
 * source contains a particular string, which is what the deep-link test used
 * to do and which is a string in a file rather than a verdict. It RUNS the
 * gate, over fixture trees it builds itself and over the real tree, and
 * asserts that the gate's verdict and this checker's verdict agree problem for
 * problem. Neither copy can move without the other.
 *
 * ---------------------------------------------------------------------------
 * COMMENTS ARE NOT COPY, AND THAT IS A DELIBERATE HOLE.
 *
 * The scan strips `//` and block comments before looking. Without that, this
 * file, the gate, every migration header and every explanation of why the rule
 * exists would fail the rule, and a check that fails on a clean checkout is a
 * check somebody deletes rather than obeys.
 *
 * Everything else is scanned: string literals, JSX text, identifiers, class
 * names, file paths and directory names. An identifier is scanned on purpose.
 * A variable called `valuationResult` becomes a test id, a CSS class, a query
 * parameter and eventually a route, and the research file's own list of places
 * the word may not appear is headed by "any route segment".
 */

/** The nouns and adjectives that import the regulated act. */
export const REGULATED_WORDS = [
  "valuation",
  "valuations",
  "valuer",
  "valuers",
  "appraisal",
  "appraisals",
  "appraise",
  "appraised",
  "appraiser",
  "appraisers",
] as const;

/**
 * ONE PATTERN PER WORD, AND THE TRAILING BOUNDARY DECIDED IN CODE.
 *
 * THREE VERSIONS OF THIS, AND THE TEST REFUSED THE FIRST TWO.
 *
 * `\b(...)\b` was the obvious spelling and it is wrong: `valuationResult` has
 * no word boundary after "valuation", because "R" is a word character, so
 * every camelCase and snake_case identifier walked straight through a rule
 * whose whole job is to keep the word out of identifiers.
 *
 * `\b(...)(?![a-z])` with the `i` flag looked like the fix and was worse.
 * Under `i`, `[a-z]` MATCHES "R", so the lookahead rejected exactly the
 * identifiers it was added to catch, and the rule was back where it started
 * with a comment explaining why it had been fixed.
 *
 * One alternation with the words ordered longest first, plus the check in
 * code, was the third and it was subtler: "ValuationSheet" matches
 * "valuations" case-insensitively, the "h" after it is lower case, the longer
 * alternative is rejected, and the regex has already consumed the position so
 * "valuation" is never tried there. A longer alternative that fails HIDES a
 * shorter one that would have matched.
 *
 * So each word gets its own pass and the longest accepted match at each index
 * wins. Slower and correct, over a scan that runs once per build.
 *
 * WHAT IT DELIBERATELY DOES NOT CATCH: a word glued to the FRONT of a
 * regulated one. "Devaluation" and "revaluation" are about a currency, which
 * this product has real cause to discuss, and the leading boundary is what
 * keeps them out of the gate's way.
 */

/** Lower case means lower case: no `i` flag on this one, deliberately. */
const CONTINUES_THE_WORD = /[a-z]/;

export const ALLOWED_PHRASE = /estate\s+surveyors?\s+and\s+valuers?/gi;

/**
 * Files where a regulated noun is permitted, with the number of occurrences
 * each may carry.
 *
 * A BUDGET AND NOT A BLANKET, because "the word is allowed in the disclaimer"
 * and "the word is allowed in the file the disclaimer lives in" are different
 * rules and only the first one is the ruling. A fourth occurrence in the
 * disclaimer file fails, and whoever wants it has to raise this number in a
 * commit with their name on it.
 *
 * `lib/legal/terms.tsx` carries two, both inside sentences saying a Vallo
 * inspection is not one. That is the permitted use and it predates this rule.
 */
export const ALLOWED_FILES: Readonly<Record<string, number>> = {
  "apps/web/src/lib/price-check/disclaimer.ts": 3,
  "apps/web/src/lib/legal/terms.tsx": 2,
};

/**
 * Files where the words are the SUBJECT rather than the copy: the rule itself.
 * Exempt outright rather than budgeted, because their word lists change when
 * the rule changes and a budget would make every widening of the rule a
 * two-line edit in two files.
 */
export const RULE_FILES: readonly string[] = [
  "apps/web/src/lib/price-check/regulated-words.ts",
  "apps/web/src/lib/price-check/regulated-words.test.ts",
  "apps/web/scripts/check-valuation-words.mjs",
];

/**
 * The disclaimer has to keep saying the word it disclaims.
 *
 * THIS IS THE HALF THAT STOPS THE RULE GOING GREEN BY ACCIDENT. Every other
 * assertion here is about the word being absent, and a scan that silently
 * stopped finding anything - a broken glob, a renamed directory, an extension
 * dropped from the list - would satisfy all of them at once and report clean.
 * A floor under the one file that MUST contain the word turns that silence
 * into a failure.
 */
export const REQUIRED_FILES: Readonly<Record<string, number>> = {
  "apps/web/src/lib/price-check/disclaimer.ts": 1,
};

/**
 * The fewest files a healthy scan sees. Same argument as REQUIRED_FILES, one
 * level up: a walker that returns nothing reports clean, and this is what
 * makes it report a fault instead. The tree held roughly 1,100 scannable
 * files when this was written; the floor is set far below that so ordinary
 * growth and ordinary deletion never trip it and a broken walk always does.
 */
export const MINIMUM_FILES_SCANNED = 300;

export type RegulatedWordProblem = {
  /** Repository-relative, forward slashes, exactly as the gate prints it. */
  file: string;
  /** 1-based. 0 where the problem is about the file rather than a line. */
  line: number;
  what: string;
};

export type ScannedFile = { path: string; text: string };

/**
 * Strips `//` line comments and block comments, leaving whitespace of the same
 * shape so line numbers survive.
 *
 * It does not parse strings, so a `//` inside a string literal is treated as a
 * comment. That is the same simplification `check-css-tokens.mjs` makes and it
 * errs towards MISSING a violation rather than inventing one, which is the
 * right direction for a build gate: a false positive fails a clean checkout
 * and gets the check deleted.
 */
export function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length));
}

/** Blanks the allowed phrase so its own regulated noun is not counted. */
export function withoutAllowedPhrase(source: string): string {
  return source.replace(ALLOWED_PHRASE, (m) => " ".repeat(m.length));
}

/** Every regulated word in one file's scannable text, with its line number. */
export function occurrencesIn(file: ScannedFile): { line: number; word: string }[] {
  const text = withoutAllowedPhrase(withoutComments(file.text));
  /* Longest accepted match per index, so "valuations" beats "valuation" where
     both end the word and neither hides the other where only one does. */
  const byIndex = new Map<number, string>();

  for (const word of REGULATED_WORDS) {
    const pattern = new RegExp(`\\b${word}`, "gi");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const after = text[match.index + match[0].length];
      if (after !== undefined && CONTINUES_THE_WORD.test(after)) continue;
      const held = byIndex.get(match.index);
      if (held === undefined || held.length < match[0].length) {
        byIndex.set(match.index, match[0]);
      }
    }
  }

  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, word]) => ({ line: text.slice(0, index).split("\n").length, word }));
}

/**
 * The word budget, and nothing else.
 *
 * Separate from the two floors below because a FIXTURE tree is a legitimate
 * thing to run this over - the test builds several - and a fixture tree has
 * neither a disclaimer file nor a thousand files in it. Running the floors
 * over one would make the test's own fixtures fail for reasons that have
 * nothing to do with the fixture. `wholeTree` carries that distinction into
 * the gate under the same name, so the two copies cannot mean different
 * things by it.
 */
export function wordProblems(files: readonly ScannedFile[]): RegulatedWordProblem[] {
  const problems: RegulatedWordProblem[] = [];

  for (const file of files) {
    if (RULE_FILES.includes(file.path)) continue;

    const hits = occurrencesIn(file);
    const budget = ALLOWED_FILES[file.path] ?? 0;
    if (hits.length <= budget) continue;

    // Everything past the budget is reported, so raising a budget by one does
    // not silently admit five.
    for (const hit of hits.slice(budget)) {
      problems.push({
        file: file.path,
        line: hit.line,
        what:
          budget === 0
            ? `"${hit.word}" is a regulated word and this file has no allowance for it. Price Check reports what places are ASKING.`
            : `"${hit.word}" is one occurrence too many in a file allowed ${budget}. Raise the allowance deliberately or reword this one.`,
      });
    }
  }

  return problems;
}

/** The disclaimer has to keep saying the word it disclaims. See REQUIRED_FILES. */
export function floorProblems(files: readonly ScannedFile[]): RegulatedWordProblem[] {
  const problems: RegulatedWordProblem[] = [];
  const counted = new Map<string, number>();
  for (const file of files) counted.set(file.path, occurrencesIn(file).length);

  for (const [path, floor] of Object.entries(REQUIRED_FILES)) {
    const seen = counted.get(path);
    if (seen === undefined) {
      problems.push({
        file: path,
        line: 0,
        what: "the scan never reached this file, so the disclaimer was not checked at all. A scan that sees nothing reports clean, which is why this floor exists.",
      });
    } else if (seen < floor) {
      problems.push({
        file: path,
        line: 0,
        what: `the standing disclaimer must say the word it disclaims, and this file carries ${seen} of the ${floor} it needs.`,
      });
    }
  }

  return problems;
}

/** A walker that returns nothing reports clean. See MINIMUM_FILES_SCANNED. */
export function coverageProblems(fileCount: number): RegulatedWordProblem[] {
  if (fileCount >= MINIMUM_FILES_SCANNED) return [];
  return [
    {
      file: "(the scan itself)",
      line: 0,
      what: `only ${fileCount} file(s) were scanned and a healthy tree has at least ${MINIMUM_FILES_SCANNED}. A walker that returns nothing reports clean.`,
    },
  ];
}

/**
 * The whole verdict. Three kinds of problem, named apart, because "the word
 * appeared where it may not", "the disclaimer stopped saying it" and "the scan
 * walked nothing" need different fixes from different people.
 */
export function regulatedWordProblems(
  files: readonly ScannedFile[],
  { wholeTree }: { wholeTree: boolean },
): RegulatedWordProblem[] {
  const problems = wordProblems(files);
  if (!wholeTree) return problems;
  return [...problems, ...floorProblems(files), ...coverageProblems(files.length)];
}
