/**
 * THE TWO-TIER OBJECTS AND THE FILES ON DISK MUST AGREE (D29), AND THE GLASS
 * ORIGINALS WIN.
 *
 * `object-assets.ts` lists the accepted tiered objects by their own names.
 * `BrandIcon` draws the founder's original glass artwork for every glass name
 * (the founder asked for the original icons back), and a tiered object only
 * for a name the glass pack does not have. Three things can go wrong and each
 * one is a visible defect in production:
 *
 *   an object names a file that is not there         a broken image
 *   a glass name draws something other than its glass original
 *   a REJECTED object is wired in                    the exact asset the light-mode check refused
 *
 * The third is the one the rejected list is for. The rejected list below is the statement
 * "these were looked at on paper at 390px and refused", and it is the same list
 * `docs/design/assets-raw/2026-10-06/slice-report.json` carries with a reason each.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TIERED_OBJECTS, brandArtwork, isTieredObject, tieredAssetFor, tieredSrc } from "./object-assets";

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

  it("every glass name draws its own glass original, never a tiered object", () => {
    const glass = glassNames();
    expect(glass.length).toBeGreaterThan(100);
    for (const name of glass) {
      const art = brandArtwork(name, name, true);
      expect(art.src, name).toBe(`/brand/glass/${name}.png`);
      expect(art.material, name).toBe("glass");
      expect(existsSync(join(PUBLIC, `brand/glass/${name}.png`)), `${name}.png`).toBe(true);
    }
    /* Names both sets share (camera, headset, key-ring, land-plot...) are among them. */
    const shared = glass.filter((name) => isTieredObject(name));
    expect(shared).toEqual(expect.arrayContaining(["camera", "headset", "key-ring", "land-plot", "warehouse"]));
  });

  it("BrandIcon resolves the legacy alias first and asks whether the glass pack has the object", () => {
    expect(SOURCE).toContain("const object = resolveObject(name);");
    expect(SOURCE).toContain("return brandArtwork(name, object, GLASS_OBJECTS.has(object));");
    expect(SOURCE).toContain("new Set(BRAND_ICONS)");
    expect(SOURCE).not.toMatch(/tieredAssetFor\(/);
    /* An alias such as `bell-alert` therefore draws the glass bell it aliases. */
    expect(brandArtwork("bell-alert", "bell-badge", true).src).toBe("/brand/glass/bell-badge.png");
  });

  it("keeps a tiered object only for a name the glass pack does not have", () => {
    expect(brandArtwork("padlock", "padlock", false)).toEqual({ src: "/brand/tier-b/padlock@2x.webp", material: "matte", object: "padlock" });
    expect(brandArtwork("prepaid-meter", "prepaid-meter", false)).toEqual({
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
