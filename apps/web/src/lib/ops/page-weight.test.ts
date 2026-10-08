import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * OPS-10: the cheap page-weight wins stay won.
 */
describe("cold page weight", () => {
  it("the image optimiser serves AVIF first, then WebP", () => {
    const config = readFileSync("next.config.ts", "utf8");
    expect(config).toContain('formats: ["image/avif", "image/webp"]');
  });

  it("preloads only the two faces the first screen paints", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const block = layout.slice(layout.indexOf("const PRELOADED_FONTS"), layout.indexOf("};", layout.indexOf("const PRELOADED_FONTS")));
    /* Poppins 600 is the heading face the first screen paints since the three
       weights pass (C6, R3-18 round 2); the files are under /fonts/v2/. */
    expect(block).toContain('default: ["inter-latin", "poppins-600-latin"]');
    expect(block).not.toMatch(/latin-ext|poppins-700/);
    expect(layout).toContain("href={`/fonts/v2/${name}.woff2`}");
    for (const name of ["inter-latin", "poppins-600-latin", "inter-vietnamese"]) {
      expect(() => readFileSync(`public/fonts/v2/${name}.woff2`)).not.toThrow();
    }
  });

  it("the logo is a vector, so no optimiser ever serves it 1920 wide", () => {
    /* OPS-10 asked the raster wordmark for its drawn size. Since D81 the
       mark and the wordmark are SVG files, which `next/image` passes through
       unoptimised: a few kilobytes at every size and density. */
    const logo = readFileSync("src/design-system/brand/Logo.tsx", "utf8");
    expect(logo).toContain('"/brand/vallo-wordmark.svg"');
    expect(logo).toContain('"/brand/vallo-mark.svg"');
    expect(logo).not.toMatch(/vallo-(mark|wordmark)(-light)?[.]png/);
  });
});
