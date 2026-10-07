import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_3D_NAMES, ICON_3D_TIER_B, icon3dEmailSrc, icon3dSrc } from "./icon-3d";

const PUBLIC = join(__dirname, "../../../public");

describe("Icon3D", () => {
  it.each(ICON_3D_NAMES)("%s has its @1x and @2x files", (name) => {
    /* D29: a name the 6 October sheets carry draws the accepted tier B object;
       the 30 September file stays on disk for the email PNGs and the rest. */
    const matte = ICON_3D_TIER_B[name];
    const dir = matte ? `brand/tier-b/${matte}` : `brand/3d/${name}`;
    expect(icon3dSrc(name)).toBe(`/${dir}@2x.webp`);
    expect(existsSync(join(PUBLIC, `${dir}.webp`))).toBe(true);
    expect(existsSync(join(PUBLIC, `${dir}@2x.webp`))).toBe(true);
  });

  it("only swaps to names that exist and are not coins or gems", () => {
    for (const matte of Object.values(ICON_3D_TIER_B)) {
      expect(matte).not.toMatch(/coin|gem/);
    }
  });

  it.each(ICON_3D_NAMES)("%s has its email PNGs", (name) => {
    expect(icon3dEmailSrc(name)).toBe(`/brand/3d/email/${name}@2x.png`);
    expect(icon3dEmailSrc(name, 1)).toBe(`/brand/3d/email/${name}.png`);
    expect(existsSync(join(PUBLIC, icon3dEmailSrc(name, 1)))).toBe(true);
    expect(existsSync(join(PUBLIC, icon3dEmailSrc(name)))).toBe(true);
  });

  it("has no duplicate names", () => {
    expect(new Set(ICON_3D_NAMES).size).toBe(ICON_3D_NAMES.length);
  });
});
