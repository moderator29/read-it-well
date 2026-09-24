import { describe, expect, it } from "vitest";

import { ledgerFromCharge, ledgerFromListing, unexplainedRemainder } from "./ledger";

/**
 * The move-in maths, in integer kobo and nothing else.
 *
 * These are the figures `components/app/listing/ListingMoveIn` prints and
 * `private.open_rent_charge` freezes, so the three must agree: the stated
 * total wins, else the parts add up, a stated zero is a line, an unstated fee
 * is not, and no float or division ever appears.
 */
const LEKKI = {
  rent_amount_minor: 850_000_000,
  rent_period: "year",
  caution_deposit_minor: 170_000_000,
  service_charge_minor: 45_000_000,
  service_charge_period: "year",
  agency_fee_minor: 85_000_000,
  legal_fee_minor: 85_000_000,
  agreement_fee_minor: 42_500_000,
  total_move_in_cost_minor: null,
};

describe("ledgerFromListing", () => {
  it("adds the stated parts in kobo when no total is stated", () => {
    const ledger = ledgerFromListing(LEKKI);
    expect(ledger?.totalMinor).toBe(1_277_500_000);
    expect(ledger?.stated).toBe(false);
    expect(ledger?.consistent).toBe(true);
    expect(ledger?.lines.map((l) => l.key)).toEqual(["rent", "caution", "service", "agency", "legal", "agreement"]);
    expect(Number.isInteger(ledger?.totalMinor)).toBe(true);
  });

  it("uses the lister's stated total even when it exceeds the parts", () => {
    const ledger = ledgerFromListing({ ...LEKKI, total_move_in_cost_minor: 1_400_000_000 });
    expect(ledger?.totalMinor).toBe(1_400_000_000);
    expect(ledger?.stated).toBe(true);
    expect(ledger?.consistent).toBe(true);
  });

  it("flags a stated total below the parts as inconsistent rather than recomputing it", () => {
    const ledger = ledgerFromListing({ ...LEKKI, total_move_in_cost_minor: 900_000_000 });
    expect(ledger?.totalMinor).toBe(900_000_000);
    expect(ledger?.consistent).toBe(false);
  });

  it("keeps a stated zero as a line and drops an unstated fee", () => {
    const ledger = ledgerFromListing({ ...LEKKI, agency_fee_minor: 0, legal_fee_minor: null });
    expect(ledger?.lines.find((l) => l.key === "agency")?.minor).toBe(0);
    expect(ledger?.lines.find((l) => l.key === "legal")).toBeUndefined();
    expect(ledger?.totalMinor).toBe(1_277_500_000 - 85_000_000 - 85_000_000);
  });

  it("refuses to charge when nothing is stated or the figure is not positive kobo", () => {
    expect(
      ledgerFromListing({
        rent_amount_minor: null,
        rent_period: null,
        caution_deposit_minor: null,
        service_charge_minor: null,
        service_charge_period: null,
        agency_fee_minor: null,
        legal_fee_minor: null,
        agreement_fee_minor: null,
        total_move_in_cost_minor: null,
      }),
    ).toBeNull();
    expect(ledgerFromListing({ ...LEKKI, total_move_in_cost_minor: 0 })).toBeNull();
    expect(ledgerFromListing({ ...LEKKI, total_move_in_cost_minor: 12.5 })).toBeNull();
  });
});

describe("ledgerFromCharge", () => {
  it("shows the frozen figure, whatever the parts add up to now", () => {
    const ledger = ledgerFromCharge({
      rent_minor: 850_000_000,
      rent_period: "year",
      caution_minor: 170_000_000,
      service_minor: null,
      agency_minor: 85_000_000,
      legal_minor: null,
      agreement_minor: null,
      total_minor: 1_105_000_000,
      total_stated: false,
    });
    expect(ledger?.totalMinor).toBe(1_105_000_000);
    expect(ledger?.lines).toHaveLength(3);
    expect(ledger?.consistent).toBe(true);
  });

  it("refuses a charge whose stored total is not positive kobo", () => {
    expect(
      ledgerFromCharge({
        rent_minor: 1,
        rent_period: "year",
        caution_minor: null,
        service_minor: null,
        agency_minor: null,
        legal_minor: null,
        agreement_minor: null,
        total_minor: 0,
        total_stated: true,
      }),
    ).toBeNull();
  });
});

describe("the unexplained remainder (V-13)", () => {
  it("names the part of a stated total nobody itemised", () => {
    const ledger = ledgerFromListing({ ...LEKKI, total_move_in_cost_minor: 1_292_500_000 });
    expect(ledger?.remainderMinor).toBe(15_000_000);
  });

  it("is zero for a summed total and for a total at its parts", () => {
    expect(ledgerFromListing(LEKKI)?.remainderMinor).toBe(0);
    expect(ledgerFromListing({ ...LEKKI, total_move_in_cost_minor: 1_277_500_000 })?.remainderMinor).toBe(0);
  });

  it("is zero, not negative, for a total below its parts", () => {
    expect(ledgerFromListing({ ...LEKKI, total_move_in_cost_minor: 1_000_000_000 })?.remainderMinor).toBe(0);
  });

  it("is carried on the frozen charge too", () => {
    const ledger = ledgerFromCharge({
      rent_minor: 300_000_000,
      rent_period: "year",
      caution_minor: 30_000_000,
      service_minor: null,
      agency_minor: 30_000_000,
      legal_minor: 15_000_000,
      agreement_minor: null,
      total_minor: 390_000_000,
      total_stated: true,
    });
    expect(ledger?.remainderMinor).toBe(15_000_000);
  });

  it("counts only whole kobo parts", () => {
    expect(unexplainedRemainder(1000, [400, 500], true)).toBe(100);
    expect(unexplainedRemainder(1000, [400, 500], false)).toBe(0);
    expect(unexplainedRemainder(1000, [400, Number.NaN], true)).toBe(600);
  });
});
