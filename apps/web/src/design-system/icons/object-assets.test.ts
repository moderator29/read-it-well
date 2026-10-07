/**
 * THE TWO-TIER MAP AND THE FILES ON DISK MUST AGREE (D29).
 *
 * `object-assets.ts` says which accepted replacement each glass name draws. Three
 * things can go wrong and each one is a visible defect in production:
 *
 *   a name maps to a file that is not there          a broken image
 *   a glass name in the map is not a real glass name a dead entry that looks like coverage
 *   a REJECTED object is wired in                    the exact asset the light-mode check refused
 *
 * The third is the one a test is for. The rejected list below is the statement
 * "these were looked at on paper at 390px and refused", and it is the same list
 * `docs/design/assets-raw/2026-10-06/slice-report.json` carries with a reason each.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GLASS_TO_TIERED, TIERED_OBJECTS, isTieredObject, tieredAssetFor, tieredSrc } from "./object-assets";

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

  it("every glass name in the map is a real glass object or a legacy alias", () => {
    const glass = new Set(glassNames());
    const legacy = new Set(["bell-alert", "chat", "bot-chat", "bot-home", "listing-review", "homes-sparkle", "house-sparkle"]);
    for (const name of Object.keys(GLASS_TO_TIERED)) {
      expect(glass.has(name) || legacy.has(name), `${name} is not a glass name`).toBe(true);
    }
  });

  it("every mapped target is an accepted object", () => {
    for (const target of Object.values(GLASS_TO_TIERED)) expect(isTieredObject(target), target).toBe(true);
  });

  it("wires in nothing that was rejected", () => {
    for (const name of REJECTED) expect(isTieredObject(name), `${name} was rejected`).toBe(false);
    for (const target of Object.values(GLASS_TO_TIERED)) expect(REJECTED).not.toContain(target);
  });

  it("keeps the casino prohibitions: no coin or gem object in tier B", () => {
    for (const name of Object.keys(TIERED_OBJECTS)) expect(name).not.toMatch(/coin|gem|chip-token/);
  });

  it("resolves a new object by its own name and a glass name through the map", () => {
    expect(tieredAssetFor("padlock")).toEqual({ tier: "b", file: "padlock" });
    expect(tieredAssetFor("shield-check")).toEqual({ tier: "b", file: "shield-tick" });
    expect(tieredAssetFor("villa")).toEqual({ tier: "a", file: "villa-pool" });
    expect(tieredAssetFor("calendar-check")).toBeUndefined();
    expect(tieredSrc({ tier: "a", file: "generator" })).toBe("/brand/tier-a/generator@2x.webp");
  });
});
