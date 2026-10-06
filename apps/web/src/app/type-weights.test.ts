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
});
