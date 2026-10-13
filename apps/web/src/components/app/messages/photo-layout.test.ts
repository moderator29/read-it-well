import { describe, expect, it } from "vitest";
import { PHOTO_GAP_PX, pageAt, photoLayout, ratioOf } from "./photo-layout";

/** The share of a basis like `calc((100% - 4px) * 0.25)`. */
const share = (basis: string) => Number(/\* ([\d.]+)\)$/.exec(basis)?.[1]);

describe("photos at their own proportions", () => {
  it("reads width over height, and refuses a size it cannot use", () => {
    expect(ratioOf({ width: 400, height: 300 })).toBeCloseTo(4 / 3);
    expect(ratioOf({ width: 0, height: 300 })).toBeNull();
    expect(ratioOf({ width: 400, height: Number.NaN })).toBeNull();
    expect(ratioOf(null)).toBeNull();
  });

  it("lets one photo fill the bubble at its own shape, capped by the tallest height", () => {
    const tall = photoLayout([0.75]);
    expect(tall.cells).toEqual([{ basis: "calc((100% - 0px) * 1)", ratio: 0.75 }]);
    expect(tall.width).toBe("min(25rem, calc(22rem * 0.75 + 0px))");
    expect(tall.pages).toBe(1);
  });

  it("gives each photo in a row its share of the width by its ratio, so all share one height", () => {
    const layout = photoLayout([4 / 3, 0.75, 1]);
    const sum = 4 / 3 + 0.75 + 1;
    expect(layout.cells.map((c) => share(c.basis))).toEqual([
      Math.round((4 / 3 / sum) * 10000) / 10000,
      Math.round((0.75 / sum) * 10000) / 10000,
      Math.round((1 / sum) * 10000) / 10000,
    ]);
    /* Same height: each share over its ratio is the same number. */
    const heights = layout.cells.map((c) => share(c.basis) / c.ratio);
    for (const h of heights) expect(h).toBeCloseTo(heights[0]!, 3);
    expect(layout.cells[0]!.basis).toContain(`100% - ${2 * PHOTO_GAP_PX}px`);
    expect(layout.pages).toBe(1);
  });

  it("keeps photos after the third at the first row's height, and counts a dot per three", () => {
    const layout = photoLayout([1, 1, 1, 2, 1, 1, 1]);
    expect(layout.cells).toHaveLength(7);
    expect(share(layout.cells[3]!.basis)).toBeCloseTo(2 / 3, 3);
    expect(layout.pages).toBe(3);
    expect(photoLayout([1, 1, 1, 1]).pages).toBe(2);
    expect(photoLayout([1, 1, 1]).pages).toBe(1);
  });

  it("lays out a photo of unknown size square until it is measured", () => {
    expect(photoLayout([null, 2]).cells.map((c) => c.ratio)).toEqual([1, 2]);
  });

  it("finds the page from the scroll, and the last page at the end of the strip", () => {
    const starts = [0, 300, 600];
    expect(pageAt(0, 700, starts)).toBe(0);
    expect(pageAt(290, 700, starts)).toBe(1);
    expect(pageAt(520, 700, starts)).toBe(2);
    expect(pageAt(700, 700, starts)).toBe(2);
    expect(pageAt(0, 0, [])).toBe(0);
  });
});
