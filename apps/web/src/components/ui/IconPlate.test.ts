import { describe, expect, it } from "vitest";
import { iconPlateClass } from "./IconPlate";

describe("iconPlateClass", () => {
  it("is the neutral medium square by default", () => {
    expect(iconPlateClass({})).toBe("nf-plate nf-plate--neutral nf-plate--md");
  });

  it("adds the round shape for content rows (section 17)", () => {
    expect(iconPlateClass({ size: "sm", tone: "info", shape: "round" })).toBe(
      "nf-plate nf-plate--info nf-plate--sm nf-plate--round",
    );
  });

  it("keeps the old tone names working", () => {
    expect(iconPlateClass({ tone: "error" })).toContain("nf-plate--danger");
    expect(iconPlateClass({ tone: "pending" })).toContain("nf-plate--warning");
  });
});
