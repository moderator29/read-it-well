import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compiledAppCss } from "@/lib/testing/locale-fit";

/**
 * NO SPACING KEY MAY TURN A DISPLAY CLASS INTO A SIZE.
 *
 * Tailwind 4's logical-size utilities (`inline-*`, `block-*`, `min-inline-*`,
 * and the rest) read the `--spacing` namespace. A spacing key called `block`
 * made the display class `inline-block` also emit
 * `inline-size: var(--nf-gap-block)`, so every inline-block element in the
 * product was about 32px wide (theme.css explains the fix). This compiles the
 * real cascade (`globals.css` through Tailwind, as the build does) and holds
 * three things:
 *
 *   1. every display class the product uses sets `display` and nothing else;
 *   2. the `block` role still reaches its value through the utilities that use
 *      it (`mt-block`, `pt-block`, `gap-block`, `space-y-block`);
 *   3. no `--spacing-*` key in theme.css is named after a word that follows
 *      `inline-` or `block-` in a display class, so the collision cannot come
 *      back under another name.
 */
const DISPLAY_CLASSES = ["block", "inline", "inline-block", "inline-flex", "inline-grid", "inline-table", "flex", "grid", "table"];

/* Every rule whose selector is exactly this class, joined: Tailwind emits a
   class's declarations in more than one rule when they come from different
   utilities (the display group and the inline-size group), so the first rule
   alone would hide the collision. */
function ruleFor(css: string, cls: string): string | null {
  const escaped = cls.replace(/[-]/g, "\\-");
  const bodies = [...css.matchAll(new RegExp(`(?:^|[{};])\\s*\\.${escaped}\\s*\\{([^}]*)\\}`, "gm"))].map((m) => m[1]!);
  return bodies.length ? bodies.join(";") : null;
}

describe("the spacing keys and the display classes", () => {
  it("leaves every display class a display class", async () => {
    const css = await compiledAppCss();
    for (const cls of DISPLAY_CLASSES) {
      const body = ruleFor(css, cls);
      if (body === null) continue;
      const props = body
        .split(";")
        .map((d) => d.trim().split(":")[0]!.trim())
        .filter(Boolean);
      expect(props, `.${cls}`).toEqual(["display"]);
    }
    expect(ruleFor(css, "inline-block"), "inline-block is used in the product, so it is compiled").not.toBeNull();
  }, 120_000);

  it("keeps the block role on the utilities that use it", async () => {
    const css = await compiledAppCss();
    /* The theme is inlined, so each utility carries the token itself. */
    expect(ruleFor(css, "mt-block")).toMatch(/margin-top:\s*var\(--nf-gap-block\)/);
    expect(ruleFor(css, "mb-block")).toMatch(/margin-bottom:\s*var\(--nf-gap-block\)/);
    expect(ruleFor(css, "pt-block")).toMatch(/padding-top:\s*var\(--nf-gap-block\)/);
    expect(ruleFor(css, "gap-block")).toMatch(/gap:\s*var\(--nf-gap-block\)/);
    expect(css).toMatch(/\.space-y-block[^{]*\{[^}]*var\(--nf-gap-block\)/);
  }, 120_000);

  it("names no spacing key after the word that follows inline- in a display class", () => {
    const theme = readFileSync(join(__dirname, "theme.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const keys = [...theme.matchAll(/--spacing-([a-z0-9-]+)\s*:/g)].map((m) => m[1]!);
    expect(keys.length).toBeGreaterThan(10);
    /* `inline-block`, `inline-flex`, `inline-grid`, `inline-table`: a key named
       after the second word would size the element. (`--spacing-inline` is safe:
       no display class is the inline- or block- prefix followed by it.) */
    const forbidden = new Set(DISPLAY_CLASSES.filter((cls) => cls.startsWith("inline-")).map((cls) => cls.slice("inline-".length)));
    expect(keys.filter((key) => forbidden.has(key))).toEqual([]);
  });
});
