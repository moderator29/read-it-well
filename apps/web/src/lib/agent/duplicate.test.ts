import { describe, expect, it } from "vitest";
import { copiesAsked, draftInputFrom, MAX_COPIES } from "./duplicate";
import { draftInputSchema } from "./listings-schema";
import type { WizardDraft } from "./listings-queries";

const SOURCE = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "PUBLISHED",
  title: "Two bedroom flat, Onike",
  description: "Newly built, prepaid meter, borehole.",
  propertyType: "rental",
  stateCode: "LA",
  city: "Lagos",
  area: "Yaba",
  address: "private address the lister typed",
  landmark: "",
  bedrooms: 2,
  bathrooms: 2,
  toilets: "3",
  parkingSpaces: "",
  floor: "2",
  totalFloors: "4",
  sizeSqm: "",
  intent: "rent",
  rentNaira: "1500000",
  rentPeriod: "year",
  rentNegotiable: false,
  cautionDepositNaira: "200000",
  serviceChargeNaira: "",
  serviceChargePeriod: "",
  agencyFeeNaira: "150000",
  legalFeeNaira: "150000",
  agreementFeeNaira: "",
  totalMoveInNaira: "",
  minimumTenancyMonths: "12",
  availableFrom: "",
  furnished: "",
  rateNaira: "",
  ratePeriod: "",
  salePriceNaira: "",
  saleAgencyFeeNaira: "",
  saleLegalFeeNaira: "",
  governorsConsentFeeNaira: "",
  stampDutyNaira: "",
  surveyRegistrationFeeNaira: "",
  totalPurchaseNaira: "",
  priceNegotiable: false,
  tenure: "",
  saleStatus: "",
  yearBuilt: "",
  condition: "newly_built",
  powerGrid: "BAND_A",
  powerBackup: "",
  powerBackupHours: "",
  waterSupply: "BOREHOLE",
  prepaidMeter: true,
  access: { estateName: "", gateDirections: "", securityPhone: "", accessCode: "" },
  amenityCodes: ["parking"],
  photos: [{ id: "p1", path: "u/l/1.webp", url: "https://x/1.webp" }],
  videos: [],
  reviewNotes: "Looks good",
} as unknown as WizardDraft;

describe("list another like this", () => {
  it("copies every fact, fee and utility answer into a draft the wizard's validator accepts", () => {
    const input = draftInputFrom(SOURCE);
    expect(input).toMatchObject({
      title: "Two bedroom flat, Onike",
      propertyType: "rental",
      area: "Yaba",
      bedrooms: 2,
      rentNaira: "1500000",
      agencyFeeNaira: "150000",
      cautionDepositNaira: "200000",
      waterSupply: "BOREHOLE",
      powerGrid: "BAND_A",
      prepaidMeter: true,
      condition: "newly_built",
    });
    expect(draftInputSchema.safeParse(input).success).toBe(true);
  });

  it("carries no id, status, code, review note, photo or video", () => {
    const input = draftInputFrom(SOURCE) as Record<string, unknown>;
    for (const key of ["id", "status", "reference", "reviewNotes", "photos", "videos"]) {
      expect(input[key], key).toBeUndefined();
    }
  });

  it("makes one to twenty copies, never more and never none", () => {
    expect(copiesAsked(undefined)).toBe(1);
    expect(copiesAsked(0)).toBe(1);
    expect(copiesAsked(12)).toBe(12);
    expect(copiesAsked(500)).toBe(MAX_COPIES);
    expect(copiesAsked("3")).toBe(3);
  });
});
