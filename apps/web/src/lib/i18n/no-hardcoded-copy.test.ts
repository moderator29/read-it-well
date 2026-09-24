import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The money and sign-up screens say nothing the dictionary does not hold.
 *
 * "Total to pay" was written into three components in English, so a Yoruba
 * or Hausa reader paying for a stay read the one line that matters most in a
 * language they had not chosen. Checkout, the rent payment, and the
 * sign-up and confirmation screens now read every sentence from
 * `@vallo/i18n`, and this keeps them that way.
 *
 * It reads the syntax tree, so comments (which quote old copy on purpose)
 * are not hits. A hit is visible JSX text with a word in it, or a string
 * literal given to a prop a person reads or hears (`title`, `label`,
 * `aria-label`, `placeholder`, `alt`, `body`, `note`, `subtitle`, `suffix`).
 * HTML entities alone (`&middot;`, `&nbsp;`) are punctuation, not copy.
 */

const SRC = join(__dirname, "..", "..");

/** The surfaces held to the rule. */
const SURFACES = ["app/(app)/checkout", "app/(app)/rent/pay", "app/(auth)", "components/auth"];

/** Props whose string value is read or announced. */
const SPOKEN = new Set(["title", "label", "aria-label", "placeholder", "alt", "body", "note", "subtitle", "suffix"]);

/** Literal copy that is not language: say why, or do not add it. */
const ALLOWED = new Set<string>([
  /* The brand name on the logo, the same in every language. */
  'title="Vallo"',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith(".tsx") && !/\.test\.tsx$/.test(name)) out.push(path);
  }
  return out;
}

const WORD = /[A-Za-z]{2,}/;

export function hardCodedCopy(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];
  const at = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const words = node.text.replace(/&[a-zA-Z]+;/g, " ").trim();
      if (WORD.test(words)) hits.push(`${file}:${at(node)}: ${words.replace(/\s+/g, " ").slice(0, 80)}`);
    } else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      let value: ts.Node = node.initializer;
      if (ts.isJsxExpression(value) && value.expression) value = value.expression;
      const literal =
        ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? value.text : null;
      if (SPOKEN.has(name) && literal !== null && WORD.test(literal)) {
        const shown = `${name}="${literal}"`;
        if (!ALLOWED.has(shown)) hits.push(`${file}:${at(node)}: ${shown.slice(0, 80)}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

describe("checkout, rent payment and sign-up read their copy from the dictionary", () => {
  it("recognises copy, and leaves expressions, entities and comments alone", () => {
    const sample = [
      "const a = <p>Total to pay</p>;",
      'const b = <Option title="Pay by card" body={c.cardBody} />;',
      "const c = <p>{c.totalToPay} &middot; {x}</p>;",
      "const d = <p>{/* Total to pay */}</p>;",
      "const e = <Amount suffix={`in full`} />;",
      'const f = <LogoMark title="Vallo" />;',
    ].join("\n");
    expect(hardCodedCopy("sample.tsx", sample).map((hit) => hit.split(":")[1])).toEqual(["1", "2", "5"]);
  });

  it("finds no hard-coded English on those surfaces", () => {
    const hits = SURFACES.flatMap((surface) =>
      walk(join(SRC, surface)).flatMap((path) =>
        hardCodedCopy(relative(SRC, path).split("\\").join("/"), readFileSync(path, "utf8")),
      ),
    );
    expect(hits).toEqual([]);
  });
});
