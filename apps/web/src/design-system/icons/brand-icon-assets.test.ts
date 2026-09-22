/**
 * THE OBJECT REGISTRY AND THE FILES ON DISK MUST AGREE, IN BOTH DIRECTIONS.
 *
 * This exists because of a real near miss. `escrow-hold` has a light twin
 * sitting in `glass/light/` with NO dark original and no entry in either list,
 * and reading the directory alone it looks exactly like a twin somebody
 * rendered and forgot to wire up. It is not: it is deliberately withheld,
 * because `docs/BRAND_MARKS.md` says build it and do not ship it until escrow
 * exists, and `lib/legal/terms.tsx` states that Vallo does not hold your money.
 * An escrow mark on a screen would be the artwork contradicting the contract.
 *
 * I was one edit from "fixing" that. The comment in `BrandIcon.tsx` is what
 * stopped me, and a comment only stops the person who reads it. These specs
 * stop everybody, and they keep stopping people once the 121 outstanding
 * renders start arriving, which is exactly when a set like this drifts.
 *
 * WHAT EACH ONE CATCHES, because a test whose failure nobody can act on is
 * just noise:
 *
 *   A name in `BRAND_ICONS` with no file is a BROKEN IMAGE in production.
 *   A file with no name is dead weight in the bundle, or a withheld mark.
 *   A name in `LIGHT_TWINS` with no light file is worse than either: the
 *     component sets `data-twinned="true"`, the plate is suppressed as though
 *     a paper-ready mark were about to paint, and a real person in daylight
 *     gets a missing image on a white page with nothing behind it.
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * THE LISTS ARE READ OUT OF THE SOURCE RATHER THAN IMPORTED, deliberately.
 *
 * `BrandIcon.tsx` is a component and importing it here drags in the JSX
 * runtime for a test that has nothing to do with rendering. What is being
 * checked is a correspondence between two LISTS and a DIRECTORY, so the source
 * text is the honest input and the test stays free of a render environment.
 */
const SOURCE = readFileSync(join(process.cwd(), "src/design-system/icons/BrandIcon.tsx"), "utf8");
const namesIn = (start: string): string[] => {
  const at = SOURCE.indexOf(start);
  if (at === -1) throw new Error(`${start} not found in BrandIcon.tsx`);
  const open = SOURCE.indexOf("[", at);
  const close = SOURCE.indexOf("]", open);
  return [...SOURCE.slice(open, close).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]!);
};
const BRAND_ICONS = namesIn("export const BRAND_ICONS");
const LIGHT_TWINS = new Set(namesIn("const LIGHT_TWINS"));

const GLASS = join(process.cwd(), "public/brand/glass");
const pngs = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.replace(/\.png$/, ""))
        .sort()
    : [];

/* Deliberately built, deliberately not shipped. See the note above and the one
   in BrandIcon.tsx. If escrow ever operates, this is one of the places that
   has to change, and it is named here so it is findable. */
const WITHHELD = new Set(["escrow-hold"]);

describe("brand object artwork", () => {
  const dark = pngs(GLASS);
  const light = pngs(join(GLASS, "light"));

  it("every named object has a dark file", () => {
    const missing = [...BRAND_ICONS].filter((n) => !dark.includes(n));
    expect(missing, `named in BRAND_ICONS with no artwork on disk: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("every dark file is a named object, or is deliberately withheld", () => {
    const orphans = dark.filter((f) => !BRAND_ICONS.includes(f) && !WITHHELD.has(f));
    expect(orphans, `artwork on disk that nothing can draw: ${orphans.join(", ")}`).toEqual([]);
  });

  it("every object claiming a light twin actually has one", () => {
    const lying = [...LIGHT_TWINS].filter((n) => !light.includes(n));
    expect(
      lying,
      `in LIGHT_TWINS with no file in glass/light: ${lying.join(", ")}. ` +
        "The plate is suppressed for these, so in daylight this is a missing " +
        "image on a white page with nothing behind it.",
    ).toEqual([]);
  });

  it("every light file is claimed, or is deliberately withheld", () => {
    const unclaimed = light.filter((f) => !LIGHT_TWINS.has(f) && !WITHHELD.has(f));
    expect(
      unclaimed,
      `light artwork on disk that nothing uses: ${unclaimed.join(", ")}. ` +
        "Either add it to LIGHT_TWINS or add it to WITHHELD with a reason.",
    ).toEqual([]);
  });

  it("a light twin is a twin of something that exists", () => {
    const strays = [...LIGHT_TWINS].filter((n) => !BRAND_ICONS.includes(n));
    expect(strays, `LIGHT_TWINS names that are not objects: ${strays.join(", ")}`).toEqual([]);
  });

  /*
   * NOT A PASS, A RECORD. 23 of 144 objects are twinned and 121 are not, and
   * in daylight those two groups are different MATERIALS: a twinned mark is a
   * pale object standing on nothing, an untwinned one is dark artwork on a
   * navy plate. This number is the real light-mode fault in the product and it
   * cannot be closed by engineering, because the missing thing is artwork.
   *
   * The assertion is deliberately one-directional. It fails if coverage goes
   * BACKWARDS, and it does not need editing as renders land; when it finally
   * reads 144 somebody can delete it.
   */
  it("light-twin coverage never goes backwards", () => {
    expect(LIGHT_TWINS.size).toBeGreaterThanOrEqual(23);
    expect(BRAND_ICONS.length).toBe(144);
  });
});
