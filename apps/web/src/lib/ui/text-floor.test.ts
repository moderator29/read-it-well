import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * NO MEMBER-FACING TEXT CAN COMPUTE UNDER 12PX (north star section 5; W12).
 * A source guard beside `components/ui/text-floor.dom.test.tsx`, which measures
 * the shared figures in Chromium: this reads every stylesheet and component for
 * a `font-size` or Tailwind `text-[...]` that is a fixed size under 12px, or an
 * em / percentage proportion of its parent (which shrinks with a small parent)
 * that is not floored with `max(..., 0.75rem)`. The console (`/admin/`), the
 * dev pages and tests are out of scope; screen-reader-only text is not drawn.
 */
const SRC = join(process.cwd(), "src");
const SKIP = /(\/admin\/|\(dev\)|\/preview\/|\.test\.|\.dom\.|\/__)/;

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.(css|tsx)$/.test(entry.name) && !SKIP.test(path)) yield path;
  }
}

const UNIT: Record<string, number> = { px: 1, rem: 16, pt: 1.333 };

/** Is this size value one that can compute under 12px? */
function underFloor(value: string): boolean {
  const v = value.replace(/^length:/, "").trim();
  /* A floor: a max() with a 12px-or-more fixed term can never go under it. */
  if (/\bmax\(/.test(v)) {
    const fixed = [...v.matchAll(/(\d*\.?\d+)(px|rem|pt)\b/g)].map((m) => Number(m[1]) * UNIT[m[2]!]!);
    if (fixed.some((px) => px >= 12)) return false;
  }
  for (const m of v.matchAll(/(\d*\.?\d+)(px|rem|pt)\b/g)) if (Number(m[1]) * UNIT[m[2]!]! < 12) return true;
  for (const m of v.matchAll(/(\d*\.?\d+)em\b/g)) if (Number(m[1]) < 1) return true;
  for (const m of v.matchAll(/(\d*\.?\d+)%/g)) if (Number(m[1]) < 100) return true;
  return /\b(smaller|x-small|xx-small|small)\b/.test(v);
}

describe("the 12px floor", () => {
  it("no stylesheet or component sets text that can compute under 12px", () => {
    const found: string[] = [];
    for (const path of files(SRC)) {
      const lines = readFileSync(path, "utf8").split("\n");
      lines.forEach((line, i) => {
        const s = line.trim();
        if (s.startsWith("*") || s.startsWith("//") || s.startsWith("/*")) return;
        const values: string[] = [];
        if (path.endsWith(".css")) {
          for (const m of line.matchAll(/font-size:\s*([^;}{]+)[;}]/g)) values.push(m[1]!);
        } else {
          for (const m of line.matchAll(/text-\[([^\]]+)\]/g)) values.push(m[1]!);
        }
        for (const value of values) if (underFloor(value)) found.push(`${path.slice(SRC.length + 1)}:${i + 1}: ${value.trim()}`);
      });
    }
    expect(found).toEqual([]);
  });
});
