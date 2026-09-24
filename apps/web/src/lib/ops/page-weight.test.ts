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
    expect(block).toContain('default: ["inter-latin", "poppins-700-latin"]');
    expect(block).not.toMatch(/latin-ext|poppins-600/);
    for (const name of ["inter-latin", "poppins-700-latin", "inter-vietnamese"]) {
      expect(() => readFileSync(`public/fonts/${name}.woff2`)).not.toThrow();
    }
  });

  it("the wordmark asks the optimiser for its drawn size, not 1920 wide", () => {
    const logo = readFileSync("src/design-system/brand/Logo.tsx", "utf8");
    expect(logo).toMatch(/sizes=\{`\$\{Math\.ceil\(\(wordSize \* 758\) \/ 167\)\}px`\}/);
  });
});
