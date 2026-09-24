import { describe, expect, it } from "vitest";
import { claimsOf, missingRequired, offeredSlots, photographed, photographedClaimed } from "./shot-list";

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

describe("photographedClaimed", () => {
  it("drops a utility label once its claim is withdrawn", () => {
    const labels = ["kitchen", "meter", "water", "power"] as const;
    const none = claimsOf({ prepaid_meter: false, water_supply: "NONE", power_backup: null });
    expect(photographedClaimed([...labels], none)).toEqual(["kitchen"]);
    const all = claimsOf({ prepaid_meter: true, water_supply: "BOREHOLE", power_backup: "INVERTER" });
    expect(photographedClaimed([...labels], all)).toEqual(["kitchen", "meter", "water", "power"]);
  });
});
