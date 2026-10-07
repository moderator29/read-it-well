/**
 * NO SPARKLE, ANYWHERE (the founder, 7 October 2026: "The AI assistant, the
 * Pro, and this For you icon: what kind of icon is that? Don't use it... use a
 * real icon for each thing. Remove the icon anywhere it is currently used.").
 *
 * The four-point star stood in for the assistant, Pro, For you, rewards, air
 * conditioning, laundry and more, so it meant nothing. Each meaning has its own
 * glyph now (`bot`, `crown`, `house-heart`, `gift`, `snowflake`, ...). This
 * fails if the name comes back as an icon reference, if its vector export
 * returns, or if its outline is pasted in by hand.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");
const REPO = join(SRC, "..", "..", "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sources(path);
    return /\.(tsx?|mjs|css)$/.test(name) ? [path] : [];
  });
}

/* A quoted name ("sparkle", 'sparkle', `sparkle`), a key (`sparkle:`), a member
   (`.sparkle`), or either outline it was ever drawn with. "homes-sparkle" and
   "house-sparkle" are 3D object names, not this glyph, and do not match. */
const REFERENCE = /["'`]sparkle["'`]|(?<![-\w])sparkle\s*:|\.sparkle\b|M11\.017 2\.814|M12 3\.5 13\.9 9\.2/;

describe("the sparkle glyph", () => {
  it("is not in the UiIcon set (neither the name union nor the outlines)", () => {
    const set = readFileSync(join(__dirname, "UiIcon.tsx"), "utf8");
    expect(set).not.toMatch(/\|\s*"sparkle"/);
    expect(set).not.toMatch(/^\s*sparkle\s*:/m);
  });

  it("has no vector export", () => {
    expect(existsSync(join(REPO, "assets/icons/ui/sparkle.svg"))).toBe(false);
  });

  it("is referenced nowhere in the web source", () => {
    const self = join(__dirname, "sparkle-ban.test.ts");
    const hits = sources(SRC)
      .filter((file) => file !== self)
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((line, i) => (REFERENCE.test(line) ? `${relative(SRC, file)}:${i + 1}` : null))
          .filter((hit): hit is string => hit !== null),
      );
    expect(hits).toEqual([]);
  });
});
