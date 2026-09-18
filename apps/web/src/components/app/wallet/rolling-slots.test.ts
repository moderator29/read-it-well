import { describe, expect, it } from "vitest";
import { rollingSlots } from "./rolling-slots";

describe("rolling slots", () => {
  it("keys digits by their position from the right", () => {
    expect(rollingSlots("12").map((s) => s.key)).toEqual(["d1", "d0"]);
    /* A digit typed after keeps the existing two where they were. */
    expect(rollingSlots("125").map((s) => s.key)).toEqual(["d2", "d1", "d0"]);
  });

  it("keys a separator by the digits to its right, so grouping survives growth", () => {
    expect(rollingSlots("1,000").map((s) => `${s.key}:${s.ch}`)).toEqual([
      "d3:1",
      "s3:,",
      "d2:0",
      "d1:0",
      "d0:0",
    ]);
    /* 999 to 1,000: d0..d2 keep their identity and roll; d3 and the comma arrive. */
    const before = rollingSlots("999").map((s) => s.key);
    const after = rollingSlots("1,000").map((s) => s.key);
    expect(before.every((k) => after.includes(k))).toBe(true);
  });

  it("staggers digits from the left and leaves separators at zero", () => {
    expect(rollingSlots("1,000").map((s) => s.fromLeft)).toEqual([0, 0, 1, 2, 3]);
  });

  it("handles an empty figure", () => {
    expect(rollingSlots("")).toEqual([]);
  });
});
