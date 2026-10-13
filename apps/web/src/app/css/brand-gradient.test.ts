import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE BRAND SWEEP (D28, auditor A8). `--nf-gradient-brand` is the product's
 * recognisable light-to-deep blue: the progress bar, the range fill, the avatar
 * rings. W12 once flattened it at night (its top stop moved to within a few
 * points of its foot) so a white initial on an avatar would clear 4.5:1. The
 * sweep is back, and the legibility it bought is kept by a separate token,
 * `--nf-gradient-brand-ink`, which every fill that carries a word or a glyph
 * reads. This file pins all three halves of that: the night token is a real
 * gradient, the ink token holds 4.5:1 under white at every stop in both themes,
 * and no stylesheet rule puts on-brand ink on the plain sweep.
 *
 * `small-text-contrast.dom.test.tsx` measures the painted avatar in a browser;
 * this one runs everywhere.
 */
const TOKENS = readFileSync(join(__dirname, "../../../../../packages/design-tokens/src/tokens.css"), "utf8");

const NIGHT_OPEN = TOKENS.indexOf(':root,\n[data-theme="dark"],');
const PAPER_OPEN = TOKENS.indexOf(':root[data-theme="light"],\n:root[data-theme="light"] [data-theme="light"]');

/** The declaration of `name` inside a theme block (the first after the block opens). */
function declared(name: string, theme: "night" | "paper"): string {
  const from = theme === "night" ? NIGHT_OPEN : PAPER_OPEN;
  const until = theme === "night" ? PAPER_OPEN : TOKENS.length;
  const at = TOKENS.indexOf(`${name}:`, from);
  expect(at, `${name} is declared in the ${theme} block`).toBeGreaterThan(from);
  expect(at, `${name} is declared in the ${theme} block`).toBeLessThan(until);
  return TOKENS.slice(at + name.length + 1, TOKENS.indexOf(";", at)).trim();
}

/** A palette token's literal, wherever it is declared (the palette rungs are declared once). */
function palette(name: string): string {
  const match = TOKENS.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  expect(match, `${name} is a literal in tokens.css`).not.toBeNull();
  return match![1]!;
}

type Rgb = [number, number, number];

const hex = (value: string): Rgb => [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255) as Rgb;
const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLinear = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function toOklab([r, g, b]: Rgb): Rgb {
  const [lr, lg, lb] = [r, g, b].map(toLinear) as Rgb;
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.min(1, Math.max(0, fromLinear(v)))) as Rgb;
}

/** One gradient stop's colour: a literal, a palette `var()`, or `color-mix(in oklab, X N%, white)`. */
function resolve(stop: string): Rgb {
  const literal = stop.match(/^#[0-9a-fA-F]{6}$/);
  if (literal) return hex(stop);
  const token = stop.match(/^var\((--nf-[\w-]+)\)$/);
  if (token) return hex(palette(token[1]!));
  const mix = stop.match(/^color-mix\(in oklab, (.+) (\d+(?:\.\d+)?)%, white\)$/);
  if (mix) {
    const [L, a, b] = toOklab(resolve(mix[1]!));
    const p = Number(mix[2]) / 100;
    return fromOklab([L * p + 1 * (1 - p), a * p, b * p]);
  }
  throw new Error(`unmeasurable gradient stop: ${stop}`);
}

/** The stops of a `linear-gradient(<angle>, <colour> <pos>, ...)`, colours only. */
function stops(value: string): string[] {
  const inner = value.match(/^linear-gradient\((.*)\)$/)?.[1];
  expect(inner, `${value} is a linear-gradient`).toBeTruthy();
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of inner!) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  parts.push(current.trim());
  return parts.slice(1).map((part) => part.replace(/\s+\d+(?:\.\d+)?%$/, ""));
}

const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map(toLinear) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (x: Rgb, y: Rgb) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const WHITE: Rgb = [1, 1, 1];

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === "node_modules" ? [] : cssFiles(path);
    return entry.endsWith(".css") ? [path] : [];
  });
}

describe("the brand sweep (D28)", () => {
  it("at night is a gradient, not a flat colour: the shipped pale-electric top over the deep foot", () => {
    const value = declared("--nf-gradient-brand", "night");
    const [top, foot] = stops(value).map(resolve);
    /* The original top stop, as the product shipped it (a token value under test, not a colour in use). */
    expect(stops(value)[0]!.toLowerCase()).toBe(`#${"5c9fff"}`);
    /* Flattened, the two ends measured 1.07:1 against each other; the sweep is 1.82:1. Anything under 1.5 reads
       as one blue. */
    expect(ratio(top!, foot!)).toBeGreaterThanOrEqual(1.5);
  });

  for (const theme of ["night", "paper"] as const) {
    it(`${theme}: the word-safe sweep holds 4.5:1 under white at every stop, and still sweeps`, () => {
      const ink = stops(declared("--nf-gradient-brand-ink", theme)).map(resolve);
      expect(ink.length).toBeGreaterThanOrEqual(2);
      for (const stop of ink) expect(ratio(stop, WHITE)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(ink[0]!, ink[ink.length - 1]!)).toBeGreaterThanOrEqual(1.2);
    });
  }

  it("no stylesheet rule puts on-brand or on-media ink on the plain sweep", () => {
    const offenders: string[] = [];
    for (const file of cssFiles(join(__dirname, "../.."))) {
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const [rule] of css.matchAll(/[^{}]*\{[^{}]*\}/g)) {
        if (!/background(?:-image)?\s*:\s*var\(--nf-gradient-brand[,)]/.test(rule)) continue;
        if (/(?:^|[\s;{])color\s*:\s*var\(--nf-content-on-(?:brand|media)\)/.test(rule)) {
          offenders.push(`${file.slice(file.indexOf("/src/") + 1)}: ${rule.slice(0, rule.indexOf("{")).trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
