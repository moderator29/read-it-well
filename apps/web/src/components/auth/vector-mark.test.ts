import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MARK_PATHS, MARK_VIEWBOX, WORDMARK_PATHS, WORDMARK_VIEWBOX, svgDocument } from "./vector-mark";

/**
 * The vector mark lives twice: as data the inline component draws, and as
 * files in `public/brand` for anything that needs a file. A duplicated drawing
 * with nothing between the copies is a drawing that will be half updated, so
 * the files must be exactly what the data writes.
 */
const brand = (name: string) => readFileSync(join(process.cwd(), "public/brand", name), "utf8");

describe("the vector mark", () => {
  it("the mark file is exactly the data", () => {
    expect(brand("vallo-mark.svg")).toBe(svgDocument(MARK_VIEWBOX, MARK_PATHS, "Vallo"));
  });

  it("the wordmark file is exactly the data", () => {
    expect(brand("vallo-wordmark.svg")).toBe(svgDocument(WORDMARK_VIEWBOX, WORDMARK_PATHS, "Vallo"));
  });

  it("holds no colour of its own: one ink, from the surface", () => {
    for (const name of ["vallo-mark.svg", "vallo-wordmark.svg"]) {
      const file = brand(name);
      expect(file).toContain('fill="currentColor"');
      expect(file).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    }
  });

  it("the native shell's offline card draws the same mark, path for path", () => {
    /* The offline card cannot fetch or import anything (the origin is
       unreachable when it shows), so the paths are inlined there. */
    const shell = readFileSync(join(process.cwd(), "native-shell/index.html"), "utf8");
    expect(shell).toContain(`viewBox="${MARK_VIEWBOX}"`);
    for (const d of MARK_PATHS) expect(shell).toContain(`d="${d}"`);
  });

  it("keeps the raster's own aspect, so it is a drop-in for vallo-mark.png", () => {
    expect(MARK_VIEWBOX).toBe("0 0 614 587");
  });
});
