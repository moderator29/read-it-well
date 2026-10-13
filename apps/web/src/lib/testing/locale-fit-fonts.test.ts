import { describe, expect, it } from "vitest";
import { compiledAppCss } from "./locale-fit";

/**
 * The locale-fit harness measures Hausa, Igbo and Yoruba in the product's own
 * faces, so every font the cascade names must be inlined as data. When the
 * re-cut fonts moved to `public/fonts/v2/` (6a50d1cf5) the inlining pattern did
 * not allow a folder, every `url(/fonts/v2/...)` was left as a path the test
 * page cannot load, and the overflow tests ran in fallback fonts (auditor A9).
 */
describe("the locale-fit cascade", () => {
  it("inlines every font it names, so the fit is measured in the product's own faces", async () => {
    const css = await compiledAppCss();
    const left = css.match(/url\(["']?\/fonts\/[^)]*\)/g) ?? [];
    expect(left).toEqual([]);
    expect(css).toContain("data:font/woff2;base64,");
  }, 120_000);
});
