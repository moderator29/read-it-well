import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { RENTAL } from "@/app/(dev)/preview/f3/fixtures";
import type { Listing } from "@/lib/listings/types";
import { HIGHLIGHTS_MAX, listingHighlights } from "./highlights";

/**
 * THE HIGHLIGHTS STRIP: only facts the lister answered, never an estimate.
 * Fewer than two answered facts draw no strip; at most three; the stated
 * move-in total only fills a gap.
 */
const t = getDictionary("en");
const base: Listing = { ...RENTAL, utilities: undefined, moveInCostMinor: undefined, moveInCostStated: undefined };

describe("listingHighlights", () => {
  it("draws nothing when nothing was answered", () => {
    expect(listingHighlights(base, t, "en", true)).toEqual([]);
  });

  it("draws nothing for a single fact", () => {
    const one = { ...base, utilities: { powerGrid: "BAND_A" as const, hasEstateAccess: false } };
    expect(listingHighlights(one, t, "en", true)).toEqual([]);
  });

  it("reads light, backup hours and water from the lister's answers", () => {
    const answered = {
      ...base,
      utilities: {
        powerGrid: "BAND_A" as const,
        powerBackup: "GENERATOR" as const,
        powerBackupHours: 6,
        waterSupply: "BOREHOLE" as const,
        hasEstateAccess: false,
      },
    };
    expect(listingHighlights(answered, t, "en", true)).toEqual([
      { key: "light", icon: "bolt", label: "Light", value: "Band A" },
      { key: "backup", icon: "clock", label: "Backup power", value: "6 hours a day" },
      { key: "water", icon: "droplet", label: "Water", value: "Borehole" },
    ]);
  });

  it("never states backup hours nobody gave, and never a backup of none", () => {
    const noHours = {
      ...base,
      utilities: { powerGrid: "PATCHY" as const, powerBackup: "INVERTER" as const, waterSupply: "TANKER" as const, hasEstateAccess: false },
    };
    expect(listingHighlights(noHours, t, "en", true).map((h) => h.key)).toEqual(["light", "water"]);
    const none = { ...noHours, utilities: { ...noHours.utilities, powerBackup: "NONE" as const, powerBackupHours: 8 } };
    expect(listingHighlights(none, t, "en", true).map((h) => h.key)).toEqual(["light", "water"]);
  });

  it("adds the stated move-in total only to fill a gap, on a tenancy only", () => {
    const two = {
      ...base,
      moveInCostMinor: 14_700_000_00,
      moveInCostStated: true,
      utilities: { powerGrid: "BAND_A" as const, waterSupply: "BOREHOLE" as const, hasEstateAccess: false },
    };
    const items = listingHighlights(two, t, "en", true);
    expect(items.map((h) => h.key)).toEqual(["light", "water", "move-in"]);
    expect(items[2]).toMatchObject({ label: "Move-in total", value: "₦14.7m" });
    expect(listingHighlights(two, t, "en", false).map((h) => h.key)).toEqual(["light", "water"]);
    expect(items.length).toBeLessThanOrEqual(HIGHLIGHTS_MAX);
  });
});
