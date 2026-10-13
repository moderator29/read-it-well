import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_KOBO,
  MAX_SALE_PRICE_KOBO,
  draftInputSchema,
  feeToNairaInput,
  koboToNairaInput,
} from "./listings-schema";

/*
 * A DRAFT FIELD THE LISTER EMPTIED IS CLEARED, NOT KEPT.
 *
 * The wizard sends every field on every save. An emptied box used to be sent
 * as "leave it" (undefined), and the action keeps what it is not sent, so a
 * deleted agency fee or street address stayed on the stored listing. Null is
 * now "clear the column"; absent and the empty string still leave it.
 */
const base = { title: "Bright 2 bedroom flat in Lekki Phase 1" };

describe("the draft schema: null clears, absent leaves", () => {
  it("passes null through for every field a lister can take back", () => {
    const parsed = draftInputSchema.parse({
      ...base,
      description: null,
      stateCode: null,
      city: null,
      area: null,
      address: null,
      landmark: null,
      toilets: null,
      parkingSpaces: null,
      floor: null,
      totalFloors: null,
      sizeSqm: null,
      rentNaira: null,
      cautionDepositNaira: null,
      serviceChargeNaira: null,
      agencyFeeNaira: null,
      legalFeeNaira: null,
      agreementFeeNaira: null,
      totalMoveInNaira: null,
      minimumTenancyMonths: null,
      availableFrom: null,
      furnished: null,
      rateNaira: null,
      salePriceNaira: null,
      saleAgencyFeeNaira: null,
      saleLegalFeeNaira: null,
      governorsConsentFeeNaira: null,
      stampDutyNaira: null,
      surveyRegistrationFeeNaira: null,
      totalPurchaseNaira: null,
      tenure: null,
      yearBuilt: null,
      condition: null,
      powerGrid: null,
      powerBackup: null,
      powerBackupHours: null,
      waterSupply: null,
    });
    for (const key of [
      "description",
      "stateCode",
      "city",
      "area",
      "address",
      "landmark",
      "toilets",
      "parkingSpaces",
      "floor",
      "totalFloors",
      "sizeSqm",
      "rentNaira",
      "cautionDepositNaira",
      "serviceChargeNaira",
      "agencyFeeNaira",
      "legalFeeNaira",
      "agreementFeeNaira",
      "totalMoveInNaira",
      "minimumTenancyMonths",
      "availableFrom",
      "furnished",
      "rateNaira",
      "salePriceNaira",
      "saleAgencyFeeNaira",
      "saleLegalFeeNaira",
      "governorsConsentFeeNaira",
      "stampDutyNaira",
      "surveyRegistrationFeeNaira",
      "totalPurchaseNaira",
      "tenure",
      "yearBuilt",
      "condition",
      "powerGrid",
      "powerBackup",
      "powerBackupHours",
      "waterSupply",
    ] as const) {
      expect(parsed[key], key).toBeNull();
    }
  });

  it("still leaves a field alone when it is absent or an empty string", () => {
    const parsed = draftInputSchema.parse({ ...base, city: "", agencyFeeNaira: "", toilets: "", furnished: "" });
    expect(parsed.city).toBeUndefined();
    expect(parsed.agencyFeeNaira).toBeUndefined();
    expect(parsed.toilets).toBeUndefined();
    expect(parsed.furnished).toBeUndefined();
    expect(parsed.area).toBeUndefined();
  });

  it("never clears a NOT NULL column: bedrooms and bathrooms read null as absent", () => {
    const parsed = draftInputSchema.parse({ ...base, bedrooms: null, bathrooms: null });
    expect(parsed.bedrooms).toBeUndefined();
    expect(parsed.bathrooms).toBeUndefined();
  });

  it("keeps a declared zero fee as zero, which is the answer 'no agency fee'", () => {
    const parsed = draftInputSchema.parse({ ...base, agencyFeeNaira: "0" });
    expect(parsed.agencyFeeNaira).toBe(0);
  });
});

describe("the sale side has its own ceiling", () => {
  it("saves a 180 million naira asking price, which the rent ceiling refused", () => {
    expect(180_000_000_00).toBeGreaterThan(MAX_PRICE_KOBO);
    const sale = draftInputSchema.safeParse({ ...base, intent: "sale", salePriceNaira: "180,000,000" });
    expect(sale.success).toBe(true);
    expect(sale.success && sale.data.salePriceNaira).toBe(180_000_000_00);
    const fees = draftInputSchema.safeParse({
      ...base,
      saleAgencyFeeNaira: "150,000,000",
      totalPurchaseNaira: "3,500,000,000",
    });
    expect(fees.success).toBe(true);
  });

  it("still refuses a rent above the rent ceiling, and a sale above its own", () => {
    const rent = draftInputSchema.safeParse({ ...base, rentNaira: "180,000,000" });
    expect(rent.success).toBe(false);
    const tooMuch = draftInputSchema.safeParse({
      ...base,
      salePriceNaira: String(MAX_SALE_PRICE_KOBO / 100 + 1),
    });
    expect(tooMuch.success).toBe(false);
  });
});

describe("the floor and the building agree before the database is asked", () => {
  it("names the floor box when the floor is above the top of the building", () => {
    const parsed = draftInputSchema.safeParse({ ...base, floor: "6", totalFloors: "5" });
    expect(parsed.success).toBe(false);
    expect(parsed.success ? null : parsed.error.issues[0]?.path).toEqual(["floor"]);
    expect(draftInputSchema.safeParse({ ...base, floor: "5", totalFloors: "5" }).success).toBe(true);
    expect(draftInputSchema.safeParse({ ...base, floor: "6", totalFloors: null }).success).toBe(true);
  });
});

describe("a stored fee comes back to the box as it was stated", () => {
  it("restores a declared zero as 0, never as an empty box", () => {
    expect(feeToNairaInput(0)).toBe("0");
    expect(koboToNairaInput(0)).toBe("");
  });

  it("restores nothing stated as an empty box, and an amount as naira text", () => {
    expect(feeToNairaInput(null)).toBe("");
    expect(feeToNairaInput(undefined)).toBe("");
    expect(feeToNairaInput(450_000_00)).toBe("450000");
    expect(feeToNairaInput(12_345)).toBe("123.45");
  });
});
