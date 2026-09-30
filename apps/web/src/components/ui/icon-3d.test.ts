import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_3D_NAMES, icon3dEmailSrc, icon3dSrc } from "./icon-3d";

const PUBLIC = join(__dirname, "../../../public");

describe("Icon3D", () => {
  it.each(ICON_3D_NAMES)("%s has its @1x and @2x files", (name) => {
    expect(icon3dSrc(name)).toBe(`/brand/3d/${name}@2x.webp`);
    expect(existsSync(join(PUBLIC, `brand/3d/${name}.webp`))).toBe(true);
    expect(existsSync(join(PUBLIC, `brand/3d/${name}@2x.webp`))).toBe(true);
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
