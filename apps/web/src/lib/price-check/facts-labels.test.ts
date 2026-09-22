import { getDictionary, LOCALES } from "@vallo/i18n";
import { describe, expect, it } from "vitest";
import {
  POWER_BACKUP_VALUES,
  POWER_GRID_VALUES,
  WATER_SUPPLY_VALUES,
  factLabel,
} from "./facts-labels";

/**
 * EVERY POWER AND WATER VALUE THE DATABASE CAN SEND HAS A WORD A PERSON READS.
 *
 * THIS TEST EXISTS BECAUSE THE PANEL SHIPPED BROKEN AND LOOKED FINE. The key
 * builder lower-cased the first part, so `BAND_A` became `gridbandA`, every
 * enum lookup returned null, and the neighbourhood facts panel rendered with
 * its power and water rows absent and its two boolean rows present. Nothing
 * threw, nothing logged, the page answered 200.
 *
 * It was caught by grepping the HTML from a real `next start` for "Band A",
 * which is not a check that runs in CI. This is the one that does.
 *
 * A member added to one of those enums in a future migration without a word
 * here would render an empty cell, and this list is what makes that a failing
 * test rather than a blank space somebody notices months later.
 */
describe("the neighbourhood facts have a word for every value", () => {
  for (const locale of LOCALES) {
    it(`covers all three enums in ${locale}`, () => {
      const copy = getDictionary(locale).priceCheck.facts as unknown as Record<string, string>;
      for (const value of POWER_GRID_VALUES) {
        expect(factLabel(value, "grid", copy), `grid ${value}`).toBeTruthy();
      }
      for (const value of POWER_BACKUP_VALUES) {
        expect(factLabel(value, "backup", copy), `backup ${value}`).toBeTruthy();
      }
      for (const value of WATER_SUPPLY_VALUES) {
        expect(factLabel(value, "water", copy), `water ${value}`).toBeTruthy();
      }
    });
  }

  it("capitalises every part, which is the bug that shipped", () => {
    expect(factLabel("BAND_A", "grid", { gridBandA: "Band A" })).toBe("Band A");
    expect(
      factLabel("GENERATOR_INVERTER", "backup", {
        backupGeneratorInverter: "Generator and inverter",
      }),
    ).toBe("Generator and inverter");
    /* The exact key the broken version produced. If this ever resolves again,
       something has re-lower-cased the first part. */
    expect(factLabel("BAND_A", "grid", { gridbandA: "Band A" })).toBeNull();
  });

  it("returns null for a member nobody has written a word for, never the key", () => {
    expect(factLabel("SOMETHING_NEW", "grid", { gridBandA: "Band A" })).toBeNull();
    expect(factLabel(null, "grid", { gridBandA: "Band A" })).toBeNull();
  });

  it("holds the enum members the live schema actually has", () => {
    expect([...POWER_GRID_VALUES]).toEqual(["BAND_A", "MOSTLY_ON", "PATCHY", "RARELY", "NONE"]);
    expect(POWER_BACKUP_VALUES).toHaveLength(5);
    expect(WATER_SUPPLY_VALUES).toHaveLength(5);
  });
});
