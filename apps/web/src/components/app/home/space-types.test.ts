import { describe, expect, it } from "vitest";
import { PROPERTY_SPACE_TYPES, orderSpaceTypes } from "./space-types";

describe("the home's space types, ordered by what somebody said they came for", () => {
  it("is the plain set, in the row's order, when nothing was said", () => {
    const ordered = orderSpaceTypes([]);
    expect(ordered.map((entry) => entry.type)).toEqual([...PROPERTY_SPACE_TYPES]);
    expect(ordered.every((entry) => !entry.mine)).toBe(true);
  });

  it("puts the stated types first and marks them, hiding nothing", () => {
    const ordered = orderSpaceTypes(["shop", "land"]);
    expect(ordered.slice(0, 2)).toEqual([
      { type: "land", mine: true },
      { type: "shop", mine: true },
    ]);
    expect(ordered).toHaveLength(PROPERTY_SPACE_TYPES.length);
  });

  it("ignores a stated interest that is the Stays side, not the Property home", () => {
    const ordered = orderSpaceTypes(["hotel", "shortlet", "restaurant"]);
    expect(ordered.some((entry) => entry.mine)).toBe(false);
  });
});
