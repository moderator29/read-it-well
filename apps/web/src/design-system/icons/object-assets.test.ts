/**
 * THE TWO-TIER OBJECTS AND THE FILES ON DISK MUST AGREE (D29), AND NOTHING
 * DRAWS GLASS.
 *
 * `object-assets.ts` lists the accepted tiered objects by their own names.
 * Until 7 October 2026 `BrandIcon` drew the glass original for every glass
 * name and these tests pinned that. The founder then ruled "Remove all glass
 * icons on the entire platform", so the rule they pin is now the opposite:
 * every glass name draws a solid object (the tiered render of the same name,
 * else the one `glass-to-solid.ts` chose). Three things can go wrong and each
 * one is a visible defect in production:
 *
 *   an object names a file that is not there         a broken image
 *   a glass name draws glass                         the thing the founder removed
 *   a REJECTED object is wired in                    the exact asset the light-mode check refused
 *
 * The third is the one the rejected list is for. The rejected list below is the statement
 * "these were looked at on paper at 390px and refused", and it is the same list
 * `docs/design/assets-raw/2026-10-06/slice-report.json` carries with a reason each.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TIERED_OBJECTS, brandArtwork, isTieredObject, solidSrc, tieredAssetFor, tieredSrc } from "./object-assets";
import { GLASS_TO_SOLID } from "./glass-to-solid";

const PUBLIC = join(process.cwd(), "public");
const SOURCE = readFileSync(join(process.cwd(), "src/design-system/icons/BrandIcon.tsx"), "utf8");
const glassNames = (): string[] => {
  const at = SOURCE.indexOf("export const BRAND_ICONS");
  const open = SOURCE.indexOf("[", at);
  const close = SOURCE.indexOf("]", open);
  return [...SOURCE.slice(open, close).matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]!);
};

/** Refused on the light-mode check, with the reason in slice-report.json. */
const REJECTED = [
  "receipt-roll",
  "bank-card",
  "hotel-canopy",
  "restaurant-awning",
  "guest-house",
  "coworking-space",
  "office-suite",
  "shop-parade",
];

describe("two-tier object map", () => {
  it("every accepted object has its 1x and 2x file", () => {
    for (const [name, asset] of Object.entries(TIERED_OBJECTS)) {
      const dir = `brand/tier-${asset.tier}/${asset.file}`;
      expect(existsSync(join(PUBLIC, `${dir}.webp`)), `${name}: ${dir}.webp`).toBe(true);
      expect(existsSync(join(PUBLIC, `${dir}@2x.webp`)), `${name}: ${dir}@2x.webp`).toBe(true);
    }
  });

  /* CHANGED 7 October 2026 (the founder: no glass anywhere). This spec used to
     assert `/brand/glass/<name>.png` and material "glass" for every name; it
     now asserts the opposite, and that the solid file is on disk. */
  it("every glass name draws a solid object that exists on disk, never glass", () => {
    const glass = glassNames();
    expect(glass.length).toBeGreaterThan(100);
    for (const name of glass) {
      const art = brandArtwork(name, name);
      expect(art.src, name).not.toContain("/brand/glass/");
      expect(["matte", "real", "solid"], name).toContain(art.material);
      expect(existsSync(join(PUBLIC, art.src)), `${name}: ${art.src}`).toBe(true);
    }
    /* The table covers the pack exactly: no glass name without a solid object. */
    expect(Object.keys(GLASS_TO_SOLID).sort()).toEqual([...glass].sort());
  });

  it("a name both sets share draws its own tiered render", () => {
    for (const name of ["camera", "headset", "key-ring", "land-plot", "warehouse"]) {
      expect(isTieredObject(name), name).toBe(true);
      expect(brandArtwork(name, name).src, name).toBe(tieredSrc(TIERED_OBJECTS[name as keyof typeof TIERED_OBJECTS]));
    }
  });

  /* CHANGED 7 October 2026: it pinned `GLASS_OBJECTS.has(object)` and the
     alias drawing the glass bell. The alias is still resolved first; it now
     draws the solid bell its target maps to. */
  it("BrandIcon resolves the legacy alias first, then draws the solid object", () => {
    expect(SOURCE).toContain("return brandArtwork(name, resolveObject(name));");
    expect(SOURCE).not.toContain("GLASS_OBJECTS");
    expect(SOURCE).not.toMatch(/tieredAssetFor\(/);
    expect(brandArtwork("bell-alert", "bell-badge").src).toBe("/brand/3d/bell@2x.webp");
    expect(brandArtwork("bell-alert", "bell-badge").object).toBe("bell-badge");
  });

  it("the founder's named surfaces draw solid objects", () => {
    /* The Neighbour badge, the side-nav flip card's two coins, the Balance wallet. */
    expect(solidSrc("home-search")).toBe("/brand/tier-b/search-pin@2x.webp");
    expect(solidSrc("hotel")).toBe("/brand/3d/hotel@2x.webp");
    expect(solidSrc("keys-home")).toBe("/brand/3d/rent@2x.webp");
    expect(solidSrc("wallet-secure")).toBe("/brand/3d/pay@2x.webp");
  });

  it("draws a tiered object for a name only the tiered set has", () => {
    expect(brandArtwork("padlock", "padlock")).toEqual({ src: "/brand/tier-b/padlock@2x.webp", material: "matte", object: "padlock" });
    expect(brandArtwork("prepaid-meter", "prepaid-meter")).toEqual({
      src: "/brand/tier-a/prepaid-meter@2x.webp",
      material: "real",
      object: "prepaid-meter",
    });
  });

  it("wires in nothing that was rejected", () => {
    for (const name of REJECTED) expect(isTieredObject(name), `${name} was rejected`).toBe(false);
  });

  it("keeps the casino prohibitions: no coin or gem object in tier B", () => {
    for (const name of Object.keys(TIERED_OBJECTS)) expect(name).not.toMatch(/coin|gem|chip-token/);
  });

  it("resolves a tiered object by its own name only, with no glass redirect", () => {
    expect(tieredAssetFor("padlock")).toEqual({ tier: "b", file: "padlock" });
    expect(tieredAssetFor("shield-check")).toBeUndefined();
    expect(tieredAssetFor("villa")).toBeUndefined();
    expect(tieredAssetFor("calendar-check")).toBeUndefined();
    expect(tieredSrc({ tier: "a", file: "generator" })).toBe("/brand/tier-a/generator@2x.webp");
  });
});
