/**
 * NOTHING DRAWS GLASS (the founder, 7 October 2026: "Remove all glass icons on
 * the entire platform").
 *
 * The glass PNGs stay on disk: `public/brand/glass` (the 144 objects and the
 * hero scenes) and the glass role crops in `public/brand/session-b/roles` are
 * commissioned artwork and deleting them is his call. What must never come
 * back is a REFERENCE to them from code that runs: a component, a module, a
 * stylesheet or a public script. This walks every one of those, strips the
 * comments (the history of why glass went is allowed to be written down),
 * and fails on any path into a glass folder that is left.
 *
 * `BrandIcon` itself is covered by `object-assets.test.ts`: every name it
 * accepts resolves to a solid file. This spec is for the paths that never
 * went through it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const GLASS_PATHS = [/brand\/glass\b/, /brand\/session-b\/roles\//];

function walk(dir: string, keep: (file: string) => boolean, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, keep, out);
    else if (keep(path)) out.push(path);
  }
  return out;
}

/** Block comments and whole-line `//` comments; strings and JSX are kept. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

const isTest = (file: string) => /\.test\.[cm]?[jt]sx?$/.test(file);

describe("no glass artwork at runtime", () => {
  const sources = walk(join(ROOT, "src"), (f) => /\.(tsx?|css)$/.test(f) && !isTest(f));
  const publicCode = walk(join(ROOT, "public"), (f) => /\.(js|mjs|css|html|json|webmanifest)$/.test(f));

  it("finds the files it is meant to read", () => {
    expect(sources.length).toBeGreaterThan(500);
  });

  it("no component, module or stylesheet references a glass folder", () => {
    const offenders: string[] = [];
    for (const file of [...sources, ...publicCode]) {
      const code = withoutComments(readFileSync(file, "utf8"));
      for (const pattern of GLASS_PATHS) {
        if (pattern.test(code)) offenders.push(`${relative(ROOT, file)} (${pattern.source})`);
      }
    }
    expect(offenders, "glass artwork referenced at runtime; draw the solid object (glass-to-solid.ts)").toEqual([]);
  });

  it("would catch one", () => {
    const sample = `const a = "/brand/glass/hotel.png"; /* "/brand/glass/x.png" */`;
    expect(GLASS_PATHS[0]!.test(withoutComments(sample))).toBe(true);
    expect(GLASS_PATHS[0]!.test(withoutComments(`/* "/brand/glass/x.png" */`))).toBe(false);
  });
});
