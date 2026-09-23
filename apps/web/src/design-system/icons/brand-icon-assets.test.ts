/**
 * THE OBJECT REGISTRY AND THE FILES ON DISK MUST AGREE, IN BOTH DIRECTIONS.
 *
 * READ THIS FIRST IF THE LIGHT HALF LOOKS MISSING. It is. Light mode was
 * removed from the platform on 23 September 2026, `LIGHT_TWINS` is deleted and
 * `BrandIcon` renders one file per object. The daylight PNGs are still in
 * `glass/light/` on purpose and one spec below asserts they stay unreferenced.
 * `docs/design/LIGHT_MODE_REMOVED.md` is the record.
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

  /*
   * THE FOUR LIGHT-TWIN SPECS THAT STOOD HERE ARE GONE, and this note is what
   * is left of them, because the directory they policed is still on disk.
   *
   * They checked that every name in `LIGHT_TWINS` had a file in
   * `glass/light/`, that every file there was claimed, that a twin was a twin
   * of something real, and that twin coverage never went backwards. All four
   * were about the daylight artwork. The founder removed light mode on 23
   * September 2026: `LIGHT_TWINS` is deleted, `BrandIcon` renders one file, and
   * nothing in the product references `glass/light/` at all.
   *
   * THE FILES STAY AND THAT IS A DECISION RATHER THAN AN OVERSIGHT. They are
   * commissioned artwork and deleting them is not this session's call, so they
   * sit there unreferenced. The spec below is what stops the next reader
   * filing that as a wiring bug: it asserts the directory is intact and
   * UNUSED, which is the state somebody has to deliberately change.
   */
  it("the daylight artwork is still on disk and is referenced by nothing", () => {
    expect(light.length, "glass/light emptied without a decision recorded").toBeGreaterThan(0);
    const referenced = SOURCE.includes("/brand/glass/light/");
    expect(
      referenced,
      "BrandIcon references glass/light again. Light mode was removed on 23 " +
        "September 2026; see docs/design/LIGHT_MODE_REMOVED.md before wiring it back.",
    ).toBe(false);
  });

  it("the object list has not moved", () => {
    expect(BRAND_ICONS.length).toBe(144);
  });
});
