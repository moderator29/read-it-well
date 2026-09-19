/**
 * Shared TypeScript/JSX parsing helpers for the R2 functionality audits.
 *
 * Everything here is deliberately dependency free beyond the `typescript`
 * package that already sits in the repo's node_modules, so every script under
 * `scripts/audit/` runs with a plain `node scripts/audit/<name>.mjs`.
 */

import { createRequire } from "node:module";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export const ts = require("typescript");

export const ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
export const WEB = path.join(ROOT, "apps", "web");
export const SRC = path.join(WEB, "src");
export const APP = path.join(SRC, "app");

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "coverage"]);

/** Every file under `dir` whose extension is in `exts`, depth first, sorted. */
export function walkFiles(dir, exts = [".ts", ".tsx"]) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        stack.push(full);
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

export function exists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

export function read(file) {
  return readFileSync(file, "utf8");
}

export function parse(file, text) {
  return ts.createSourceFile(
    file,
    text ?? read(file),
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

export function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function rel(file) {
  return path.relative(ROOT, file);
}

/** The tag name of a JSX element, e.g. `button`, `Button`, `Foo.Bar`. */
export function tagNameOf(node) {
  const tag = ts.isJsxSelfClosingElement(node)
    ? node.tagName
    : ts.isJsxOpeningElement(node)
      ? node.tagName
      : null;
  if (!tag) return null;
  return tag.getText();
}

/** The JSX attributes of an opening or self-closing element, as a Map. */
export function attrsOf(node) {
  const map = new Map();
  const props = node.attributes?.properties ?? [];
  for (const prop of props) {
    if (ts.isJsxAttribute(prop) && prop.name) {
      map.set(prop.name.getText(), prop);
    } else if (ts.isJsxSpreadAttribute(prop)) {
      map.set("__spread__", prop);
    }
  }
  return map;
}

/** The literal string value of a JSX attribute, or null when it is dynamic. */
export function literalAttr(attr) {
  if (!attr || !attr.initializer) return null;
  const init = attr.initializer;
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    const e = init.expression;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return e.text;
  }
  return null;
}

/** True when a JSX attribute's value is a literal `true` (or bare presence). */
export function isTrueAttr(attr) {
  if (!attr) return false;
  if (!attr.initializer) return true; // bare `disabled`
  const init = attr.initializer;
  if (ts.isJsxExpression(init) && init.expression) {
    return init.expression.kind === ts.SyntaxKind.TrueKeyword;
  }
  return false;
}

/**
 * True when a handler expression does nothing at all: `() => {}`,
 * `() => undefined`, `() => null`, `function () {}`, or `undefined`.
 */
export function isNoopHandler(attr) {
  if (!attr || !attr.initializer) return false;
  const init = attr.initializer;
  if (!ts.isJsxExpression(init) || !init.expression) return true; // onClick="..." is meaningless
  const e = init.expression;
  if (e.kind === ts.SyntaxKind.UndefinedKeyword) return true;
  if (ts.isIdentifier(e) && e.text === "undefined") return true;
  const body = ts.isArrowFunction(e) || ts.isFunctionExpression(e) ? e.body : null;
  if (!body) return false;
  if (ts.isBlock(body)) {
    const live = body.statements.filter((s) => !ts.isEmptyStatement(s));
    if (live.length === 0) return true;
    // A body that only preventDefault()s and nothing else is still a dead control.
    if (
      live.length === 1 &&
      ts.isExpressionStatement(live[0]) &&
      /^(e|ev|event)\.(preventDefault|stopPropagation)\(\)$/.test(live[0].expression.getText())
    ) {
      return true;
    }
    return false;
  }
  const text = body.getText().trim();
  return text === "undefined" || text === "null" || text === "{}" || text === "void 0";
}

/** Walk every node in a source file. */
export function forEachNode(sourceFile, visit) {
  const go = (node) => {
    visit(node);
    ts.forEachChild(node, go);
  };
  go(sourceFile);
}

export function pct(n, d) {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

export function heading(title) {
  return `\n${title}\n${"=".repeat(title.length)}`;
}
