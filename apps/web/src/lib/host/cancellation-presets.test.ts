import { describe, expect, it } from "vitest";
import { offeredPolicies, refundLines, refundTiers, tableRuleLines } from "./cancellation-presets";

/**
 * The cancellation presets a host picks, and the plain sentences every screen
 * prints from their tiers. The sentences are built from the same tiers a
 * refund is computed from, so they are pinned here word for word.
 */
const FIRM = {
  id: "firm",
  name: "Firm",
  summary: "Full refund 30 days out, half 7 days out, nothing after.",
  isFreeUntilHours: 720,
  preset: "firm",
  rules: [
    { hours_before: 720, refund_bps: 10000 },
    { hours_before: 168, refund_bps: 5000 },
    { hours_before: 0, refund_bps: 0 },
  ],
};

describe("refundLines", () => {
  it("says each tier of Firm in the order a guest meets it", () => {
    expect(refundLines(FIRM)).toEqual([
      "Cancel at least 30 days before check-in: a full refund.",
      "Cancel between 7 days and 30 days before check-in: 50% back.",
      "Cancel less than 7 days before check-in: no refund.",
    ]);
  });

  it("says Flexible in hours and Strict without a free window", () => {
    expect(
      refundLines({ summary: "", rules: [{ hours_before: 24, refund_bps: 10000 }, { hours_before: 0, refund_bps: 0 }] }),
    ).toEqual(["Cancel at least 1 day before check-in: a full refund.", "Cancel less than 1 day before check-in: no refund."]);
    expect(refundLines({ summary: "", rules: [{ hours_before: 168, refund_bps: 5000 }] })).toEqual([
      "Cancel at least 7 days before check-in: 50% back.",
      "Cancel less than 7 days before check-in: no refund.",
    ]);
  });

  it("falls back to the policy's own words when its tiers cannot be read", () => {
    expect(refundLines({ summary: "Ask the host.", rules: [{ hours_before: "soon" }] })).toEqual(["Ask the host."]);
    expect(refundTiers(null)).toEqual([]);
  });
});

describe("offeredPolicies", () => {
  it("offers the four presets in their order when the estate has them", () => {
    const rows = [
      { ...FIRM, id: "s", name: "Strict", preset: "strict" },
      { ...FIRM, id: "old", name: "Non-refundable", preset: null },
      { ...FIRM, id: "f", name: "Flexible", preset: "flexible" },
      FIRM,
    ];
    expect(offeredPolicies(rows).map((row) => row.id)).toEqual(["f", "firm", "s"]);
  });

  it("offers every policy where no preset exists yet", () => {
    const rows = [{ ...FIRM, preset: null }];
    expect(offeredPolicies(rows)).toHaveLength(1);
  });
});

describe("tableRuleLines", () => {
  it("always says a table is free and paid at the restaurant, then the venue's own rules", () => {
    expect(tableRuleLines({ holdMinutes: 15, cancelNoticeHours: 2, sittingMinutes: 90 })).toEqual([
      "Asking for a table is free. The restaurant confirms it when a table is free, and you pay the bill at the restaurant.",
      "Please cancel at least 2 hours ahead if you cannot come.",
      "A table is held for 15 minutes after the booked time.",
      "A table is yours for about 1 hour 30 minutes.",
    ]);
    expect(tableRuleLines({ holdMinutes: null, cancelNoticeHours: null, sittingMinutes: null })).toHaveLength(1);
  });
});
