/**
 * EVERY EMAIL IS DARK, AND READS AS WRITTEN AND INVERTED (Track H, 25
 * September; dark by the founder's ruling of 29 September 2026).
 *
 * Gmail strips `@media (prefers-color-scheme)` and runs its own dark pass
 * (its apps invert), Outlook's Word engine reads `bgcolor` and ignores the
 * `background:` shorthand, Outlook.com repaints only what it thinks is
 * unpainted, and Apple Mail honours `color-scheme` and the media query. So
 * for every message the product sends (the whole catalogue, and the five
 * auth templates the generator writes), this holds:
 *
 *   1. the color-scheme and supported-color-schemes metas say "dark", so
 *      Apple Mail renders the design as written rather than inverting it;
 *   2. every body, table and cell carries a `bgcolor` attribute AND an inline
 *      `background-color`, and the two agree (so nothing is left for a client
 *      to paint);
 *   3. every text element (p, h1, li, a, span, and a cell that holds words)
 *      names its colour inline, and that colour clears WCAG AA (4.5:1)
 *      against the ground it sits on (the white label on the button is
 *      measured against the button's solid fallback);
 *   4. AS WRITTEN AND INVERTED: the same pair still clears AA after
 *      `invert(1) hue-rotate(180deg)`, the transform Gmail's apps apply;
 *   5. RE-ASSERTED BY CLASS: every text element on a ground the style block
 *      re-asserts carries the class that re-asserts its ink too, and that
 *      pair clears AA. A ground with no class (the blue button) keeps its
 *      written pair, already measured.
 *
 * The browser sweep in the report (every template screenshotted light, dark,
 * inverted and Outlook-partial) measured the same things on the rendered
 * page. This is the part of it that runs on every commit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { EVERY_MESSAGE } from "./fixtures";
import { paintExplicit } from "./render";
import { DARK, SKY } from "./theme";

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

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (c: number[]) => "#" + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

function lum(hex: string): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** `invert(1) hue-rotate(180deg)`, by the Filter Effects matrices. */
function inverted(hex: string): string {
  const [r, g, b] = rgb(hex).map((v) => 255 - v) as [number, number, number];
  const m = [
    [0.213 - 0.787, 0.715 + 0.715, 0.072 + 0.072],
    [0.213 + 0.213, 0.715 - 0.285, 0.072 + 0.072],
    [0.213 + 0.213, 0.715 + 0.715, 0.072 - 0.928],
  ];
  return hexOf(m.map(([x, y, z]) => x! * r + y! * g + z! * b));
}

/** What the dark scheme repaints, by class. */
const DARK_GROUND: Record<string, string> = {
  "rm-base": DARK.ground,
  "rm-card": DARK.card,
  "rm-panel": DARK.panel,
};
const DARK_INK: Record<string, string> = {
  "rm-title": DARK.text,
  "rm-body": DARK.body,
  "rm-muted": DARK.muted,
  "rm-link": SKY,
};
const classOf = (attrs: string, table: Record<string, string>) =>
  (/\bclass="([^"]*)"/.exec(attrs)?.[1] ?? "").split(/\s+/).find((c) => c in table) ?? null;

type Ground = { light: string; dark: string; repainted: boolean };
/* `light` is the ground as written (the name predates the dark redesign and
   means "the inline layer"); `dark` is what the style block re-asserts. */

describe.each(EVERY)("$name", ({ html }) => {
  it("declares itself dark in both colour-scheme metas", () => {
    expect(html).toContain('<meta name="color-scheme" content="dark" />');
    expect(html).toContain('<meta name="supported-color-schemes" content="dark" />');
  });

  it("paints the dark palette inline on the body, not a light one", () => {
    const b = body(html);
    expect(b).toMatch(new RegExp(`^<body[^>]*bgcolor="${DARK.ground}"`));
    const painted = [...b.matchAll(/bgcolor="(#[0-9a-fA-F]{6})"/g)].map((m) => m[1]!.toUpperCase());
    /* Nothing but the navy rungs and the button blue ever paints a ground. */
    const light = painted.filter((hex) => lum(hex) > 0.2);
    expect(light).toEqual([]);
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

  it("names every text colour inline, at AA as written, inverted, and in the dark scheme", () => {
    const missing: string[] = [];
    const weak: string[] = [];
    const unrepainted: string[] = [];
    /* Walk the tags in order, keeping the painted ground of the nearest cell,
       and what the dark scheme makes of it. */
    const grounds: Ground[] = [];
    const top = (): Ground => grounds.at(-1) ?? { light: DARK.ground, dark: DARK.ground, repainted: true };
    for (const m of body(html).matchAll(/<(\/?)(body|table|td|p|h1|li|a|span)\b([^>]*)>([^<]*)/gi)) {
      const [, close, tag, attrs = "", after = ""] = m;
      const t = tag!.toLowerCase();
      if (["body", "table", "td"].includes(t)) {
        if (close) grounds.pop();
        else {
          const own = /\bbgcolor="(#[0-9a-fA-F]{6})"/.exec(attrs)?.[1];
          const cls = classOf(attrs, DARK_GROUND);
          grounds.push(
            own
              ? { light: own, dark: cls ? DARK_GROUND[cls]! : own, repainted: cls !== null }
              : top(),
          );
        }
      }
      if (close) continue;
      const words = after.replace(/&[a-z#0-9]+;/gi, " ").trim();
      if (!words || /display\s*:\s*none/i.test(attrs)) continue;
      const colour = /(?:^|[;"\s])color\s*:\s*(#[0-9a-fA-F]{6})/i.exec(attrs)?.[1];
      if (!colour) {
        missing.push(`<${t}> "${words.slice(0, 30)}"`);
        continue;
      }
      const ground = top();
      const label = `"${words.slice(0, 30)}"`;
      if (ratio(colour, ground.light) < 4.5) weak.push(`light ${ratio(colour, ground.light).toFixed(2)} ${colour} on ${ground.light} ${label}`);
      const ci = inverted(colour);
      const gi = inverted(ground.light);
      if (ratio(ci, gi) < 4.5) weak.push(`inverted ${ratio(ci, gi).toFixed(2)} ${ci} on ${gi} ${label}`);
      if (ground.repainted) {
        const ink = classOf(attrs, DARK_INK);
        if (!ink) {
          unrepainted.push(`<${t}> ${label} keeps ${colour} on a ground the dark scheme makes ${ground.dark}`);
          continue;
        }
        const dark = DARK_INK[ink]!;
        if (ratio(dark, ground.dark) < 4.5) weak.push(`dark ${ratio(dark, ground.dark).toFixed(2)} ${dark} on ${ground.dark} ${label}`);
      }
    }
    expect(missing).toEqual([]);
    expect(unrepainted).toEqual([]);
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

  it("carries the container's ground class down with its colour, so the dark scheme repaints both", () => {
    const out = paintExplicit(
      '<td class="rm-card" bgcolor="#FFFFFF" style="background-color:#FFFFFF;"><table role="presentation"><tr><td class="x" style="padding:0;">y</td></tr></table></td>',
    );
    expect(out).toContain('<table role="presentation" bgcolor="#FFFFFF" style="background-color:#FFFFFF;" class="rm-card">');
    expect(out).toContain('class="x rm-card"');
  });

  it("does not hand a ground class to a cell with its own colour, such as the button", () => {
    const out = paintExplicit(
      '<td class="rm-card" bgcolor="#FFFFFF"><table><tr><td style="background-color:#005FE8;">Go</td></tr></table></td>',
    );
    expect(out).toContain('<td style="background-color:#005FE8;" bgcolor="#005FE8">');
  });
});

describe("the inversion transform the sweep uses", () => {
  it("turns white into near black and keeps a grey a grey", () => {
    expect(inverted("#FFFFFF")).toBe("#000000");
    const [r, g, b] = rgb(inverted("#808080"));
    expect(Math.max(r!, g!, b!) - Math.min(r!, g!, b!)).toBeLessThanOrEqual(1);
  });
});
