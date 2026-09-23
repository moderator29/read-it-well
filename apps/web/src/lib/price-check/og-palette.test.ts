import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { OG_PALETTE_SOURCES } from "./og-palette";

/**
 * THE SHARE IMAGE'S LITERALS, HELD TO THE TOKENS THEY WERE COPIED FROM.
 *
 * `og-palette.ts` carries six hex literals because Satori renders outside the
 * DOM and resolves no CSS custom property: `var(--nf-surface-canvas)` in an
 * Open Graph card paints nothing. Its header says all of that. What a comment
 * cannot do is notice the day somebody changes `--nf-brand-primary` in
 * `packages/design-tokens/src/tokens.css` and the share card keeps rendering
 * in the old blue, in a picture nobody on this team ever looks at because it is
 * only ever seen inside somebody else's chat app.
 *
 * So this is the same instrument `lib/email/shell.test.ts` uses for the email
 * palette, and for the same reason: an exemption from the colour rule is only
 * honest if something checks the copy.
 *
 * IT FOLLOWS THE `var()` CHAIN ITSELF. Several semantic tokens are declared as
 * `var(--nf-mist-100)` and the like, so a test that looked one up and stopped
 * would find a `var()`, compare it against a hex, and fail on every correct
 * value. The palette lists LAYER-2 names only, because ADR-002 says a component
 * reads layer 2 and `nf/no-raw-colour` enforces that on the names as well; the
 * walk down to the palette entry belongs here, in a test, where naming one is
 * describing the tree rather than depending on it.
 */

const TOKENS = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "packages",
  "design-tokens",
  "src",
  "tokens.css",
);

/**
 * The DARK declarations only.
 *
 * The paper twin restates many of these under `:root[data-theme="light"]`, and
 * an OG card has no theme to follow: it is rendered once on a server and shown
 * inside an app that has its own idea of dark and light. So the source is the
 * dark block, and everything from the light selector onwards is cut away
 * before anything is read.
 */
function darkDeclarations(): Map<string, string> {
  /* COMMENTS FIRST, and the first run of this test is why: `tokens.css`
     EXPLAINS the light twin in its header, so the cut was being made at a
     sentence about the selector rather than at the selector, and two thirds of
     the dark block was thrown away before anything was read. */
  const css = readFileSync(TOKENS, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
  const lightAt = css.indexOf(':root[data-theme="light"]');
  expect(lightAt, "tokens.css no longer declares a light twin the way this test reads it").toBeGreaterThan(-1);
  const dark = css.slice(0, lightAt);
  const out = new Map<string, string>();
  for (const match of dark.matchAll(/(--nf-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1] ?? "";
    /* FIRST DECLARATION WINS, because a later one inside a narrower selector
       is a variant rather than the base value. */
    if (!out.has(name)) out.set(name, (match[2] ?? "").trim());
  }
  return out;
}

/**
 * One token down to the literal it ends at.
 *
 * Bounded, and the bound is the assertion rather than a safety net: a token
 * that pointed at itself would otherwise spin here rather than fail, and a
 * hanging test is a test nobody keeps.
 */
function resolve(declarations: Map<string, string>, token: string): string {
  let current = token;
  for (let hop = 0; hop < 8; hop += 1) {
    const value = declarations.get(current);
    expect(value, `${current} is no longer declared in tokens.css`).toBeDefined();
    const indirection = /^var\(\s*(--[a-z0-9-]+)\s*\)$/.exec(value ?? "");
    if (indirection === null) return (value ?? "").trim();
    current = indirection[1] ?? "";
  }
  throw new Error(`${token} does not resolve to a value within eight hops`);
}

describe("the share image's colours are the tokens, in a medium that cannot read tokens", () => {
  const declarations = darkDeclarations();

  it("reads a tokens.css that actually has tokens in it", () => {
    /* A parser that stopped matching would return an empty map, and "every
       literal matches nothing" would then be vacuously true of any palette.
       The shape is checked before the values are. */
    expect(declarations.size).toBeGreaterThan(50);
    expect(declarations.get("--nf-surface-canvas")).toBeDefined();
  });

  for (const { value, token } of OG_PALETTE_SOURCES) {
    it(`${token} still resolves to ${value}`, () => {
      expect(resolve(declarations, token).toUpperCase()).toBe(value.toUpperCase());
    });
  }
});
