import { describe, expect, it } from "vitest";
import {
  bpsLabel,
  computeMoveIn,
  inputFromQuery,
  percentToBps,
  publishedRule,
  queryFromInput,
  shareOf,
} from "./move-in-calculator";

describe("the public move-in calculator", () => {
  it("is empty until a rent is typed, and names a bad field", () => {
    expect(computeMoveIn({ rent: "", years: 1, fees: {} })).toEqual({ state: "empty" });
    expect(computeMoveIn({ rent: "abc", years: 1, fees: {} })).toEqual({ state: "invalid", field: "rent" });
    expect(computeMoveIn({ rent: "1,000,000", years: 1, fees: { agency: { mode: "percent", value: "300" } } })).toEqual({
      state: "invalid",
      field: "agency",
    });
  });

  it("adds only the fees that were typed, amounts and percents alike", () => {
    const result = computeMoveIn({
      rent: "1,500,000",
      years: 1,
      fees: {
        agency: { mode: "percent", value: "10" },
        legal: { mode: "amount", value: "150,000" },
        caution: { mode: "amount", value: "" },
      },
    });
    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.lines.map((line) => line.key)).toEqual(["rent", "agency", "legal"]);
    expect(result.totalMinor).toBe((1_500_000 + 150_000 + 150_000) * 100);
  });

  it("adds a year of rent for every further year asked up front, as the listing maths does", () => {
    const result = computeMoveIn({ rent: "1000000", years: 2, fees: { agency: { mode: "amount", value: "100000" } } });
    if (result.state !== "ok") throw new Error("expected ok");
    expect(result.totalMinor).toBe((2_000_000 + 100_000) * 100);
    expect(result.lines[0]).toEqual({ key: "rent", minor: 2_000_000 * 100 });
  });

  it("reads percents as basis points and rounds to the kobo", () => {
    expect(percentToBps("7.5")).toBe(750);
    expect(percentToBps("10%")).toBe(1000);
    expect(percentToBps("101")).toBeNull();
    expect(shareOf(333_33, 1000)).toBe(3333);
    expect(bpsLabel(1000)).toBe("10%");
    expect(bpsLabel(750)).toBe("7.5%");
  });

  it("offers a published rule only where the data holds one", () => {
    expect(publishedRule("LA")?.source).toBeTruthy();
    expect(publishedRule("FC")).toBeNull();
  });

  it("round-trips a share link with only the figures", () => {
    const input = { rent: "1500000", years: 2, fees: { agency: { mode: "percent" as const, value: "10" } } };
    const query = queryFromInput(input, "LA");
    expect(query).toBe("?rent=1500000&years=2&state=LA&agency=10&agencyMode=percent");
    const back = inputFromQuery(Object.fromEntries(new URLSearchParams(query)));
    expect(back).toEqual(input);
  });
});
