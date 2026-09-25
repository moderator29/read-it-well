/**
 * TRACK H: EVERY EMAIL IS DARK WITH EXPLICIT COLOURS, IN EVERY CLIENT.
 *
 * Gmail strips `@media (prefers-color-scheme)` and runs its own dark pass,
 * Outlook's Word engine reads `bgcolor` and ignores the `background:`
 * shorthand, and Apple Mail honours `color-scheme`. So a dark email must not
 * depend on classes or on inheritance anywhere. For every message the product
 * sends (the whole catalogue, and the five auth templates the generator
 * writes), this holds:
 *
 *   1. the color-scheme and supported-color-schemes metas say dark;
 *   2. every body, table and cell carries a `bgcolor` attribute AND an inline
 *      `background-color`, and the two agree;
 *   3. every text element (p, h1, li, a, span, and a cell that holds words)
 *      names its colour inline;
 *   4. that colour clears WCAG AA (4.5:1) against the ground it sits on,
 *      where the ground is a flat colour (the lit button's white on its blue
 *      is measured against the button's solid fallback).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { EVERY_MESSAGE } from "./fixtures";
import { paintExplicit } from "./render";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const TEMPLATES = join(HERE, "..", "..", "..", "..", "..", "supabase", "templates");
const AUTH = ["confirmation", "email-change", "invite", "magic-link", "recovery"].map((name) => ({
  name: `auth:${name}`,
  html: readFileSync(join(TEMPLATES, `${name}.html`), "utf8"),
}));

const EVERY = [...EVERY_MESSAGE.map(({ name, message }) => ({ name, html: message.html })), ...AUTH];

/** The body, without comments (MSO conditionals hold VML we do not measure). */
function body(html: string): string {
  return html.slice(html.indexOf("<body")).replace(/<!--[\s\S]*?-->/g, "");
}

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]!) + 0.7152 * f(c[1]!) + 0.0722 * f(c[2]!);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe.each(EVERY)("$name", ({ html }) => {
  it("declares dark in both colour-scheme metas", () => {
    expect(html).toContain('<meta name="color-scheme" content="dark" />');
    expect(html).toContain('<meta name="supported-color-schemes" content="dark" />');
  });

  it("paints every body, table and cell with bgcolor and an inline background-color that agree", () => {
    const bad: string[] = [];
    for (const m of body(html).matchAll(/<(body|table|td)\b([^>]*)>/gi)) {
      const attrs = m[2] ?? "";
      const attr = /\bbgcolor="(#[0-9a-fA-F]{6})"/.exec(attrs)?.[1];
      const inline = /background-color\s*:\s*(#[0-9a-fA-F]{6})/.exec(attrs)?.[1];
      if (!attr || !inline || attr.toUpperCase() !== inline.toUpperCase()) bad.push(m[0].slice(0, 140));
    }
    expect(bad).toEqual([]);
  });

  it("names the colour of every piece of text inline, at AA against its ground", () => {
    const missing: string[] = [];
    const weak: string[] = [];
    /* Walk the tags in order, keeping the painted ground of the nearest cell. */
    const grounds: string[] = [];
    for (const m of body(html).matchAll(/<(\/?)(body|table|td|p|h1|li|a|span)\b([^>]*)>([^<]*)/gi)) {
      const [, close, tag, attrs = "", after = ""] = m;
      const t = tag!.toLowerCase();
      if (["body", "table", "td"].includes(t)) {
        if (close) grounds.pop();
        else grounds.push(/\bbgcolor="(#[0-9a-fA-F]{6})"/.exec(attrs)?.[1] ?? grounds.at(-1) ?? "#000000");
      }
      if (close) continue;
      const words = after.replace(/&[a-z#0-9]+;/gi, " ").trim();
      if (!words || /display\s*:\s*none/i.test(attrs)) continue;
      const colour = /(?:^|[;"\s])color\s*:\s*(#[0-9a-fA-F]{6})/i.exec(attrs)?.[1];
      if (!colour) {
        missing.push(`<${t}> "${words.slice(0, 30)}"`);
        continue;
      }
      const ground = grounds.at(-1) ?? "#000000";
      if (ratio(colour, ground) < 4.5) weak.push(`${ratio(colour, ground).toFixed(2)} ${colour} on ${ground} "${words.slice(0, 30)}"`);
    }
    expect(missing).toEqual([]);
    expect(weak).toEqual([]);
  });
});

describe("paintExplicit", () => {
  it("gives a bare cell its container's colour, in both forms, and keeps attribute order", () => {
    const out = paintExplicit(
      '<body bgcolor="#010118" style="background:#010118;"><table role="presentation" width="600"><tr><td style="padding:4px;">x</td></tr></table></body>',
    );
    expect(out).toContain('<table role="presentation" width="600" bgcolor="#010118" style="background-color:#010118;">');
    expect(out).toContain('<td style="padding:4px;background-color:#010118;" bgcolor="#010118">');
  });

  it("keeps a cell's own colour over its container's", () => {
    const out = paintExplicit('<table bgcolor="#010118"><tr><td style="background:#000040;">x</td></tr></table>');
    expect(out).toContain('bgcolor="#000040"');
    expect(out).toContain("background-color:#000040;");
  });
});
