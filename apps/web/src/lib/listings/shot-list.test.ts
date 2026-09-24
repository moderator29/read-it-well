import { describe, expect, it } from "vitest";
import { missingRequired, offeredSlots, photographed } from "./shot-list";

describe("shot list", () => {
  it("offers a utility slot only when the utility is claimed", () => {
    expect(offeredSlots({ prepaidMeter: false, waterSupply: null, powerBackup: "NONE" })).not.toEqual(
      expect.arrayContaining(["meter"]),
    );
    const all = offeredSlots({ prepaidMeter: true, waterSupply: "BOREHOLE", powerBackup: "GENERATOR" });
    expect(all).toEqual(expect.arrayContaining(["meter", "water", "power"]));
    expect(offeredSlots({ prepaidMeter: null, waterSupply: "NONE", powerBackup: null })).toHaveLength(6);
  });
  it("names the required slots still missing", () => {
    expect(missingRequired(["kitchen", null, "front"])).toEqual(["living", "bedroom"]);
    expect(missingRequired(["front", "living", "kitchen", "bedroom", "bedroom"])).toEqual([]);
  });
  it("lists what was photographed once each, in shot-list order", () => {
    expect(photographed(["water", "kitchen", "kitchen", undefined, "meter"])).toEqual(["kitchen", "meter", "water"]);
  });
});
