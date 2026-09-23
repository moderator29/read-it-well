import { describe, expect, it } from "vitest";
import { badgeTierFrom } from "./badge";

describe("badgeTierFrom", () => {
  it("passes the two drawn tiers through as the view published them", () => {
    expect(badgeTierFrom("gold")).toBe("gold");
    expect(badgeTierFrom("platinum")).toBe("platinum");
  });
  it("draws nothing for none, an absent row, or anything it does not know", () => {
    expect(badgeTierFrom("none")).toBeNull();
    expect(badgeTierFrom(null)).toBeNull();
    expect(badgeTierFrom(undefined)).toBeNull();
    expect(badgeTierFrom("Gold")).toBeNull();
  });
});
