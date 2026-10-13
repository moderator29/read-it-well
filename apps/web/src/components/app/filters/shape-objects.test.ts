import { describe, expect, it } from "vitest";
import { UNIT_SHAPES } from "@/lib/listings/unit-shape";
import { isTieredObject } from "@/design-system/icons/object-assets";
import { BQ_OBJECT, SHAPE_OBJECT } from "./shape-objects";

describe("the Shape tiles draw the realistic 3D objects", () => {
  it("gives every unit shape an object", () => {
    for (const shape of UNIT_SHAPES) expect(SHAPE_OBJECT[shape], shape).toBeTruthy();
    expect(Object.keys(SHAPE_OBJECT).sort()).toEqual([...UNIT_SHAPES].sort());
  });

  it("draws only accepted Tier A renders, never a glass or a line name", () => {
    for (const shape of UNIT_SHAPES) expect(isTieredObject(SHAPE_OBJECT[shape]), shape).toBe(true);
    expect(isTieredObject(BQ_OBJECT)).toBe(true);
  });

  it("gives the shapes that can sit side by side a different object each", () => {
    const names = UNIT_SHAPES.map((shape) => SHAPE_OBJECT[shape]);
    expect(new Set(names).size).toBe(names.length);
  });
});
