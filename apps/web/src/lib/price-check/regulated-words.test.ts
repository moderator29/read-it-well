import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  ALLOWED_FILES,
  MINIMUM_FILES_SCANNED,
  REGULATED_WORDS,
  coverageProblems,
  floorProblems,
  occurrencesIn,
  regulatedWordProblems,
  wordProblems,
  type ScannedFile,
} from "./regulated-words";

/**
 * THE RULE IS TESTED HERE; THE BUILD IS GATED IN
 * `scripts/check-valuation-words.mjs`.
 *
 * ---------------------------------------------------------------------------
 * THE TWO WAYS A RULE LIKE THIS FAILS, AND BOTH ARE COVERED DELIBERATELY.
 *
 * IT CAN BE PERMANENTLY RED. A gate that fails on a clean checkout is a gate
 * somebody deletes rather than obeys, which is written out at length in
 * `check-css-tokens.mjs` about the raw-colour count. So the last block here
 * runs the gate over the REAL TREE and asserts it passes today, which means
 * the day this rule landed it was green and stayed useful.
 *
 * IT CAN GO GREEN BY ACCIDENT, and this is the harder one. Every assertion a
 * word-ban makes is about an ABSENCE, and absences are satisfied wholesale by
 * a scan that walked nothing: a broken glob, a renamed directory, an extension
 * dropped from the list. The gate would report clean, in a voice of total
 * confidence, over a tree it never opened. Three things here stop that:
 *
 *   1. The gate is RUN over fixture trees that DO contain the word, and it has
 *      to refuse them. A scanner that sees nothing fails this immediately.
 *   2. `floorProblems` asserts the standing disclaimer still SAYS the word it
 *      disclaims, so at least one assertion in the rule is about a presence.
 *   3. `coverageProblems` asserts the walk reached a plausible number of
 *      files at all.
 *
 * ---------------------------------------------------------------------------
 * AND THE GATE IS RUN, NOT READ.
 *
 * Nothing here asserts that the gate's SOURCE contains a particular string.
 * That is what the deep-link test used to do, and its own rewrite note says
 * why it was wrong: a string in a file is not a verdict. The gate re-states
 * the rules in plain JavaScript rather than importing the TypeScript checker,
 * on purpose and for a reason in its own header, and a hand copy of a rule is
 * exactly the thing that drifts. So the two copies are run over the SAME
 * fixture trees and their verdicts are compared file for file and line for
 * line. Neither can move without the other.
 */

const GATE = join(__dirname, "..", "..", "..", "scripts", "check-valuation-words.mjs");
const REPO = join(__dirname, "..", "..", "..", "..", "..");

const temps: string[] = [];
afterAll(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** Writes a fixture tree and returns its root plus the files as the checker sees them. */
function fixture(files: Record<string, string>): { root: string; scanned: ScannedFile[] } {
  const root = mkdtempSync(join(tmpdir(), "vallo-words-"));
  temps.push(root);
  const scanned: ScannedFile[] = [];
  for (const [path, text] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text, "utf8");
    scanned.push({ path, text });
    /* Every directory on the way is a route segment, and the gate scans those
       names as well as the files. The checker is handed them the same way so
       the two are looking at the same set. */
    const parts = path.split("/");
    for (let i = 0; i < parts.length - 1; i += 1) {
      const dir = parts.slice(0, i + 1).join("/");
      if (!scanned.some((f) => f.path === dir)) scanned.push({ path: dir, text: parts[i]! });
    }
  }
  return { root, scanned };
}

/** Runs the gate and reports what it DID, not what its source says. */
function runGate(args: string[] = []): { status: number; output: string } {
  try {
    const stdout = execFileSync(process.execPath, [GATE, ...args], {
      stdio: "pipe",
      encoding: "utf8",
    });
    return { status: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? -1,
      output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
    };
  }
}

/**
 * THE WHOLE-TREE RUN, DONE ONCE.
 *
 * `runGate()` with no arguments spawns a Node process that walks every source
 * file in the repository. Two assertions below need that verdict, and calling
 * it twice walked the tree twice: about a second each in isolation, and past
 * vitest's five second default when the rest of the suite is running in
 * parallel on the same box. That is a test that fails for a reason with
 * nothing to do with what it asserts, which teaches a reader to re-run rather
 * than to look, and a re-run is not a root cause.
 *
 * So the walk happens once and both assertions read the same verdict. The
 * timeout below is on the run, not on the assertions, and it is generous
 * because the cost being measured is a subprocess walking a growing tree.
 */
let treeGateVerdict: { status: number; output: string } | null = null;
function treeGate(): { status: number; output: string } {
  treeGateVerdict ??= runGate();
  return treeGateVerdict;
}

/** The `path:line` pairs the gate named, in the shape it prints them. */
function reported(output: string): string[] {
  return [...output.matchAll(/^ {2}(\S+)\n {4}what:/gm)].map((m) => m[1] ?? "").sort();
}

/** The same pairs from the checker's own verdict. */
function expected(problems: { file: string; line: number }[]): string[] {
  return problems.map((p) => (p.line > 0 ? `${p.file}:${p.line}` : p.file)).sort();
}

describe("the word list is the regulated vocabulary and nothing else", () => {
  it("covers the four families the ruling names, in both numbers", () => {
    /* The ruling names valuation, valuer, appraisal and appraised. The plurals
       and the verb are here because a ban that a plural walks through is a ban
       on one spelling rather than on a word. */
    for (const word of ["valuation", "valuer", "appraisal", "appraised"]) {
      expect(REGULATED_WORDS).toContain(word);
    }
    expect(REGULATED_WORDS.length).toBeGreaterThanOrEqual(8);
  });

  it("catches a camelCase and a snake_case identifier, which a trailing \\b does not", () => {
    /* THIS TEST IS WHY THE PATTERN IS NOT `\\b(...)\\b`. The first version of the
       rule used two boundaries, and "R" is a word character, so
       `valuationResult` had no boundary after "valuation" and every identifier
       in the language walked through a rule whose whole job is to keep the
       word out of identifiers. The research file's own list of places the word
       may not appear is headed by "any route segment", and a route segment is
       usually somebody's variable first. */
    expect(occurrencesIn({ path: "x.ts", text: "const valuationResult = 1;" })).toHaveLength(1);
    expect(occurrencesIn({ path: "x.ts", text: "const valuation_result = 1;" })).toHaveLength(1);
    expect(occurrencesIn({ path: "x.ts", text: "export function ValuationSheet() {}" })).toHaveLength(1);
  });

  it("counts a plural once rather than twice", () => {
    expect(occurrencesIn({ path: "x.ts", text: '"two valuations"' })).toHaveLength(1);
  });

  it("does not ban `value`, which is a word this product still needs", () => {
    /* "Value" is the noun of art in the Green Book and is avoided in the
       RESULT copy by editorial discipline, not by this gate. Banning it
       mechanically would fail `wallet balance value`, `input.value` and every
       `Object.values` in the tree, which is how a gate becomes a gate people
       delete. */
    expect(occurrencesIn({ path: "x.ts", text: "const value = input.value;" })).toEqual([]);
    expect(occurrencesIn({ path: "x.ts", text: "Object.values(rows)" })).toEqual([]);
    expect(occurrencesIn({ path: "x.ts", text: "a valuable property" })).toEqual([]);
  });

  it("does not ban a currency devaluation, which this product has cause to discuss", () => {
    /* The leading word boundary is what allows this, and it is a deliberate
       hole rather than an oversight: the naira has moved enough that a
       sentence about devaluation is a sentence this product may need to
       write, and it implies nothing about who may practise. */
    expect(occurrencesIn({ path: "x.ts", text: '"after the devaluation"' })).toEqual([]);
  });
});

describe("what counts as an occurrence", () => {
  it("counts a string, a heading and an identifier alike", () => {
    const hits = occurrencesIn({
      path: "x.tsx",
      text: [
        'const title = "Property valuation";',
        "<h2>Valuation</h2>",
        "const valuationResult = 1;",
      ].join("\n"),
    });
    expect(hits.map((h) => h.line)).toEqual([1, 2, 3]);
  });

  it("does not count a comment, which is not copy", () => {
    expect(
      occurrencesIn({
        path: "x.ts",
        text: "// this is not a valuation\n/* nor is this a valuation */\nconst a = 1;",
      }),
    ).toEqual([]);
  });

  it("keeps the line number right after a block comment is stripped", () => {
    const hits = occurrencesIn({
      path: "x.ts",
      text: "/*\n a\n b\n*/\nconst t = 'valuation';",
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]!.line).toBe(5);
  });

  it("allows the registered profession's own name, which is a disclaimer not a claim", () => {
    expect(
      occurrencesIn({ path: "x.ts", text: 'name: "Estate surveyor and valuer"' }),
    ).toEqual([]);
    expect(
      occurrencesIn({ path: "x.ts", text: '"the Estate Surveyors and Valuers Act"' }),
    ).toEqual([]);
  });

  it("still catches the regulated noun in the same line as the allowed phrase", () => {
    /* "Only an estate surveyor and valuer may carry out a valuation" is the
       disclaimer sentence: the phrase is exempt, the noun beside it is not,
       and it is the noun the budget counts. */
    const hits = occurrencesIn({
      path: "x.ts",
      text: '"Only an estate surveyor and valuer may carry out a valuation in Nigeria."',
    });
    expect(hits.map((h) => h.word.toLowerCase())).toEqual(["valuation"]);
  });
});

describe("the gate and the checker agree, over trees that are and are not clean", () => {
  it("both pass a tree that only names the profession", () => {
    const { root, scanned } = fixture({
      "src/app/price/page.tsx": "<h1>Price Check</h1>",
      "src/lib/people.ts": 'const jobs = ["Estate surveyor and valuer"];',
      "src/lib/note.ts": "// the word valuation is banned outside the disclaimer\nexport const a = 1;",
    });
    expect(wordProblems(scanned)).toEqual([]);
    const gate = runGate(["--root", root]);
    expect(gate.status, gate.output).toBe(0);
  });

  it("both refuse a heading, a string, an identifier and a route segment", () => {
    const { root, scanned } = fixture({
      "src/app/valuation/page.tsx": '<h1>Valuation</h1>\nconst t = "Free valuation";',
      "src/lib/model.ts": "export const valuationResult = 1;",
    });
    const problems = wordProblems(scanned);
    /* Four: the directory name, the heading, the string and the identifier. */
    expect(problems).toHaveLength(4);
    expect(problems.some((p) => p.file === "src/app/valuation")).toBe(true);

    const gate = runGate(["--root", root]);
    expect(gate.status, gate.output).toBe(1);
    expect(reported(gate.output), "the gate and the checker disagree about this tree").toEqual(
      expected(problems),
    );
  });

  it("both refuse the occurrence past a budget, and pass the ones inside it", () => {
    const path = "apps/web/src/lib/legal/terms.tsx";
    expect(ALLOWED_FILES[path]).toBe(2);

    const inside = fixture({ [path]: "<p>not a valuation</p>\n<p>not a valuation</p>" });
    expect(wordProblems(inside.scanned)).toEqual([]);
    expect(runGate(["--root", inside.root]).status).toBe(0);

    const over = fixture({
      [path]: "<p>not a valuation</p>\n<p>not a valuation</p>\n<p>a valuation</p>",
    });
    const problems = wordProblems(over.scanned);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(3);

    const gate = runGate(["--root", over.root]);
    expect(gate.status, gate.output).toBe(1);
    expect(reported(gate.output)).toEqual(expected(problems));
  });

  it("reports every occurrence past a budget, so raising one by a step admits a step", () => {
    const path = "apps/web/src/lib/legal/terms.tsx";
    const { root, scanned } = fixture({
      [path]: ["a valuation", "a valuation", "a valuation", "a valuation", "a valuation"].join(
        "\n",
      ),
    });
    expect(wordProblems(scanned)).toHaveLength(3);
    expect(reported(runGate(["--root", root]).output)).toHaveLength(3);
  });
});

describe("the half that stops the rule going green by accident", () => {
  it("fails when the standing disclaimer stops saying the word it disclaims", () => {
    const path = "apps/web/src/lib/price-check/disclaimer.ts";
    expect(floorProblems([{ path, text: 'export const d = "This is not a valuation.";' }])).toEqual(
      [],
    );
    const lost = floorProblems([{ path, text: 'export const d = "This is only an estimate.";' }]);
    expect(lost).toHaveLength(1);
    expect(lost[0]!.what).toContain("must say the word it disclaims");
  });

  it("fails when the scan never reached the disclaimer at all", () => {
    const missed = floorProblems([{ path: "src/other.ts", text: "const a = 1;" }]);
    expect(missed).toHaveLength(1);
    expect(missed[0]!.what).toContain("never reached this file");
  });

  it("fails when the walk returned implausibly little", () => {
    expect(coverageProblems(MINIMUM_FILES_SCANNED)).toEqual([]);
    const thin = coverageProblems(0);
    expect(thin).toHaveLength(1);
    expect(thin[0]!.what).toContain("walker that returns nothing reports clean");
  });

  it("applies both floors over a whole tree and neither over a fixture", () => {
    const one: ScannedFile[] = [{ path: "src/a.ts", text: "const a = 1;" }];
    expect(regulatedWordProblems(one, { wholeTree: false })).toEqual([]);
    /* The same one-file list, called the whole tree, is two faults: no
       disclaimer and no coverage. That asymmetry is the flag the gate carries
       as `--root`, and it means the same thing on both sides. */
    expect(regulatedWordProblems(one, { wholeTree: true })).toHaveLength(2);
  });
});

describe("the tree as it actually is", () => {
  it("passes the gate today, so the rule is not born red", { timeout: 60_000 }, () => {
    const gate = treeGate();
    expect(gate.status, gate.output).toBe(0);
    expect(gate.output).toContain("valuation words: clean");
  });

  it("has walked a real number of files and says so", { timeout: 60_000 }, () => {
    const gate = treeGate();
    const count = Number(/clean - (\d+) files/.exec(gate.output)?.[1] ?? 0);
    expect(count).toBeGreaterThan(MINIMUM_FILES_SCANNED);
  });

  it("agrees with the checker about the two files that carry the word", () => {
    for (const [path, budget] of Object.entries(ALLOWED_FILES)) {
      const text = readFileSync(join(REPO, path), "utf8");
      const hits = occurrencesIn({ path, text });
      expect(hits.length, `${path} carries ${hits.length} of its ${budget}`).toBeLessThanOrEqual(
        budget,
      );
      expect(wordProblems([{ path, text }])).toEqual([]);
    }
  });

  it("keeps the standing disclaimer saying it", () => {
    const path = "apps/web/src/lib/price-check/disclaimer.ts";
    const text = readFileSync(join(REPO, path), "utf8");
    expect(floorProblems([{ path, text }])).toEqual([]);
  });
});
