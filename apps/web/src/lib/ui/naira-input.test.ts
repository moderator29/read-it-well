import { describe, expect, it } from "vitest";
import { caretAfter, readNairaTyping, significantBefore } from "./naira-input";

describe("naira as it is typed", () => {
  it("groups the figure and keeps the plain value", () => {
    expect(readNairaTyping("1500000")).toEqual({ display: "1,500,000", value: "1500000" });
    expect(readNairaTyping("₦ 1,500,000")).toEqual({ display: "1,500,000", value: "1500000" });
    expect(readNairaTyping("")).toEqual({ display: "", value: "" });
  });

  it("drops leading zeros and stray letters", () => {
    expect(readNairaTyping("00450k")).toEqual({ display: "450", value: "450" });
  });

  it("drops a full stop and its tail when kobo is not taken", () => {
    expect(readNairaTyping("1500.00")).toEqual({ display: "1,500", value: "1500" });
  });

  it("keeps up to two kobo digits when asked", () => {
    expect(readNairaTyping("1500.5", true)).toEqual({ display: "1,500.5", value: "1500.5" });
    expect(readNairaTyping("1500.567", true)).toEqual({ display: "1,500.56", value: "1500.56" });
    expect(readNairaTyping(".5", true)).toEqual({ display: "0.5", value: "0.5" });
  });

  it("keeps the caret after the same digit when a comma appears", () => {
    /* "15000|" typed to "150000|": still at the end. */
    expect(caretAfter("150,000", significantBefore("150000", 6))).toBe(7);
    /* Caret after the "1" of "1|5000": stays after the "1". */
    expect(caretAfter("15,000", significantBefore("15000", 1))).toBe(1);
    expect(caretAfter("1,500", 0)).toBe(0);
  });
});
