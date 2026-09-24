import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * No counted phrase is inflected by hand.
 *
 * `n === 1 ? "night" : "nights"`, and its shorter cousin
 * `night${n === 1 ? "" : "s"}`, is English grammar written into a component
 * of a product that ships in four languages. Seventy of them were in the
 * source. A counted phrase now comes from the dictionary's `units` table
 * through `countOf` (or a dictionary pair through `plural`), which picks the
 * form by the locale's own plural rules.
 *
 * This reads the syntax tree rather than the text, so a comment that quotes
 * the old pattern (several do, on purpose) is not a hit, and a ternary split
 * over three lines is. A hit is a conditional whose test compares against the
 * number 1 and either of whose branches is a string or template literal with
 * a letter in it: `=== 1 ? "" : "s"`, `=== 1 ? "1 guest" : \`${n} guests\``,
 * and `=== 1 ? "report has" : "reports have"` all match, while
 * `=== 1 ? copy.one : copy.many` (a dictionary pair) does not.
 *
 * Development previews under `(dev)` are not shipped and are not read.
 */

const SRC = join(__dirname, "..", "..");

/** A literal that is not a plural: say why, or do not add it. */
const ALLOWED = new Map<string, string>([
  [
    "components/social/feed/PostCard.tsx",
    "the `sizes` attribute of a one-photo post versus a grid: layout, not language",
  ],
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "(dev)" && name !== "node_modules") walk(path, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith(".d.ts")) {
      out.push(path);
    }
  }
  return out;
}

function comparesWithOne(node: ts.Expression): boolean {
  let test = node;
  while (ts.isParenthesizedExpression(test)) test = test.expression;
  if (!ts.isBinaryExpression(test)) return false;
  const op = test.operatorToken.kind;
  if (op !== ts.SyntaxKind.EqualsEqualsEqualsToken && op !== ts.SyntaxKind.ExclamationEqualsEqualsToken) return false;
  const one = (side: ts.Expression) => ts.isNumericLiteral(side) && side.text === "1";
  return one(test.left) || one(test.right);
}

function wordy(node: ts.Expression): boolean {
  let branch = node;
  while (ts.isParenthesizedExpression(branch)) branch = branch.expression;
  if (ts.isStringLiteral(branch) || ts.isNoSubstitutionTemplateLiteral(branch)) return /[A-Za-z]/.test(branch.text);
  if (ts.isTemplateExpression(branch)) {
    return [branch.head.text, ...branch.templateSpans.map((span) => span.literal.text)].some((part) => /[A-Za-z]/.test(part));
  }
  return false;
}

export function handInflected(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isConditionalExpression(node) && comparesWithOne(node.condition) && (wordy(node.whenTrue) || wordy(node.whenFalse))) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      hits.push(`${file}:${line + 1}: ${node.getText(source).replace(/\s+/g, " ").slice(0, 100)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

describe("counted phrases come from the dictionary", () => {
  it("recognises the shapes it exists to refuse, and leaves a dictionary pair alone", () => {
    const sample = [
      'const a = n === 1 ? "night" : "nights";',
      "const b = `${n} night${n === 1 ? \"\" : \"s\"}`;",
      "const c = n === 1\n  ? \"1 guest\"\n  : `${n} guests`;",
      'const d = (n !== 1) ? "reports have" : "report has";',
      "const e = n === 1 ? copy.one : copy.many;",
      "// n === 1 ? \"night\" : \"nights\"",
      'const f = n === 2 ? "pair" : "other";',
    ].join("\n");
    expect(handInflected("sample.ts", sample).map((hit) => hit.split(":")[1])).toEqual(["1", "2", "3", "6"]);
  });

  it("finds no hand-inflected English plural anywhere in the app", () => {
    const hits = walk(SRC).flatMap((path) => {
      const file = relative(SRC, path).split("\\").join("/");
      if (ALLOWED.has(file)) return [];
      return handInflected(file, readFileSync(path, "utf8"));
    });
    expect(hits).toEqual([]);
  });

  it("keeps every allowance pointing at a file that still exists and still needs it", () => {
    for (const [file] of ALLOWED) {
      expect(handInflected(file, readFileSync(join(SRC, file), "utf8")).length, file).toBeGreaterThan(0);
    }
  });
});
