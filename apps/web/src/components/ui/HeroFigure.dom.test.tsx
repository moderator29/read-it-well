import { describe, expect, it } from "vitest";
import { splitCounted } from "./HeroFigure";

describe("splitCounted", () => {
  it("finds the whole naira inside a formatted figure", () => {
    const text = `₦${new Intl.NumberFormat("en-NG").format(12500)}`;
    expect(splitCounted(text, 12500, "en-NG")).toEqual({ prefix: "₦", suffix: "" });
  });

  it("keeps a unit after the number", () => {
    expect(splitCounted("82 of 100", 82, "en-NG")).toEqual({ prefix: "", suffix: " of 100" });
  });

  it("refuses a number that is only part of a longer one", () => {
    expect(splitCounted("₦1,250", 250, "en-NG")).toBeNull();
    expect(splitCounted("7.94", 7, "en-NG")).toBeNull();
  });

  it("refuses what it cannot count honestly", () => {
    expect(splitCounted("-₦500", -500, "en-NG")).toBeNull();
    expect(splitCounted("2.8m", 3, "en-NG")).toBeNull();
  });
});
