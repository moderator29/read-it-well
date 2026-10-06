import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE TYPE SYSTEM IS 400, 600 AND 700 (north star 5; craft doctrine 2: three
 * weights maximum). Nothing in the app draws a weight above 700: not the
 * result screen, not a money figure, not a post's price. This walks every
 * source file under `src` (stylesheets, components, pages, libraries) and fails
 * on `font-extrabold`, `font-black`, `font-[800]` or `font-[900]`,
 * `font-weight: 800` or `900` or `bolder`, and `fontWeight: 800` or `900`.
 *
 * AND NOTHING DRAWS 500 (Session 3 ruling on CRAFT_DOCTRINE "three weights
 * maximum"): `font-medium`, `font-[500]`, `font-weight: 500` and
 * `fontWeight: 500` (a JSX attribute, `fontWeight="500"`, included) and a
 * `font:` shorthand with a 500 are the fourth weight, and every site went to
 * 400 or 600 by its role: labels, titles, links, figures, errors, and the
 * selected or current state at 600; muted or secondary text, inputs and
 * sentences at 400; and a tab or nav row that has its own 600 selected state
 * at 400 when it is not selected. Not every control separates its states by
 * weight: the Segmented items are 600 in BOTH states and are told apart by the
 * capsule behind the chosen one, and so is the feed's segment link (a fill).
 * The few files that still carry a 500 are named in `ALLOWED_500` below with
 * the reason.
 *
 * Not held to it: the admin console and the dev previews (`app/admin`,
 * `app/(dev)`), which are staff and harness surfaces with their own pass, and
 * tests, which may name a banned weight in order to ban it.
 */
const SRC = join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", "admin", "(dev)"]);

function files(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files(path, out);
    else if (/\.(tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * The 500s that remain, each by the lead's ruling. A stale entry (the file no
 * longer has a 500) fails the second test, so this list can only shrink.
 */
const ALLOWED_500: Record<string, string> = {
  "components/site/landing/StoreBadges.tsx": "the official store-badge artwork (SVG text), drawn to each store's own spec",
  "lib/email/render.ts": "email has its own type rules (ruling: the one inline 500 stays)",
  "app/css/admin.css": "the console's stylesheet has its own owner (ruling: out of this pass)",
};

const WEIGHT_500 = [
  /\bfont-medium\b/,
  /font-\[500\]/,
  /font-weight:\s*500\b/,
  /fontWeight(?::\s*|=\{?\s*)["']?500\b/,
  /font:\s*[^;{}"'`]*\b500\b/,
];

const BANNED = [
  /font-extrabold/,
  /font-black/,
  /font-\[[89]00\]/,
  /font-weight:\s*(?:[89]00|bolder)/,
  /fontWeight:\s*["']?(?:[89]00|bolder)/,
];

describe("the type weights", () => {
  const all = files(SRC);

  it("walks the app (a guard that finds no files guards nothing)", () => {
    expect(all.length).toBeGreaterThan(500);
  });

  it("no source file outside admin and the dev previews draws a weight above 700", () => {
    const found = all
      .filter((file) => {
        const text = strip(readFileSync(file, "utf8"));
        return BANNED.some((pattern) => pattern.test(text));
      })
      .map((file) => file.slice(SRC.length + 1));
    expect(found).toEqual([]);
  });

  const has500 = (file: string) => {
    const text = strip(readFileSync(file, "utf8"));
    return WEIGHT_500.some((pattern) => pattern.test(text));
  };

  it("no source file outside admin and the dev previews draws weight 500, apart from the listed few", () => {
    const found = all
      .filter(has500)
      .map((file) => file.slice(SRC.length + 1))
      .filter((file) => !(file in ALLOWED_500));
    expect(found).toEqual([]);
  });

  it("every allowed 500 still exists, so the list only shrinks", () => {
    const stale = Object.keys(ALLOWED_500).filter((file) => !has500(join(SRC, file)));
    expect(stale).toEqual([]);
  });
});
