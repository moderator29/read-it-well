import { describe, expect, it } from "vitest";
import { bpsAsPercentText } from "./percent";

describe("bpsAsPercentText", () => {
  it("prints whole percentages without a decimal", () => {
    expect(bpsAsPercentText(5000)).toBe("50");
    expect(bpsAsPercentText(10_000)).toBe("100");
    expect(bpsAsPercentText(0)).toBe("0");
  });
  it("prints fractions exactly, with no float noise", () => {
    expect(bpsAsPercentText(1250)).toBe("12.5");
    expect(bpsAsPercentText(3333)).toBe("33.33");
    expect(bpsAsPercentText(1505)).toBe("15.05");
    expect(bpsAsPercentText(7)).toBe("0.07");
  });
  it("never prints a negative or a non-number", () => {
    expect(bpsAsPercentText(-100)).toBe("0");
    expect(bpsAsPercentText(Number.NaN)).toBe("0");
  });
});
