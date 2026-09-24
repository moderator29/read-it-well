import { describe, expect, it } from "vitest";
import { draftInputSchema } from "./listings-schema";
import {
  amountToKobo,
  BROADCAST_MONEY_KEYS,
  parseBroadcast,
  percentToBasisPoints,
  shareOf,
  type BroadcastParse,
} from "./broadcast";

/** Every filled key must be a field the draft schema knows. */
function schemaKeys(): Set<string> {
  return new Set(Object.keys(draftInputSchema.shape));
}

function assertDraftable(result: BroadcastParse) {
  const keys = schemaKeys();
  for (const key of result.filled) expect(keys.has(key), `${key} is not a draft field`).toBe(true);
  /* And it survives the real validator, which is what saveDraft runs. */
  const parsed = draftInputSchema.safeParse({ title: "A title long enough", ...result.values });
  expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  /* Nothing a stranger could use to go round the platform survives. */
  const carried = JSON.stringify(result.values);
  expect(carried).not.toMatch(/0[789][01]\d{8}/);
  expect(carried).not.toMatch(/\+?234\s?[789]/);
}

describe("money is worked out here, in integer kobo, never by a model", () => {
  it("reads the ways agents write a figure", () => {
    expect(amountToKobo("1.5", "m")).toBe(150_000_000);
    expect(amountToKobo("200", "k")).toBe(20_000_000);
    expect(amountToKobo("1,500,000", undefined)).toBe(150_000_000);
    expect(amountToKobo("2.25", "M")).toBe(225_000_000);
    expect(amountToKobo("1.2", "b")).toBe(120_000_000_000);
    expect(amountToKobo("850", "thousand")).toBe(85_000_000);
    expect(amountToKobo("0", "k")).toBeNull();
  });

  it("holds percentages as basis points and rounds a share to the kobo", () => {
    expect(percentToBasisPoints("10")).toBe(1000);
    expect(percentToBasisPoints("7.5")).toBe(750);
    expect(percentToBasisPoints("5")).toBe(500);
    expect(shareOf(150_000_000, 1000)).toBe(15_000_000);
    expect(shareOf(123_456_789, 750)).toBe(9_259_259);
  });
});

describe("fifteen real-shaped broadcasts", () => {
  it("1. the founder's own example, Onike, Yaba", () => {
    const r = parseBroadcast(
      "2 bedroom flat at Onike, Yaba. Rent 1.5m, agency 10%, legal 10%, caution 200k. Prepaid meter, borehole, gated compound. Serious clients only",
    );
    expect(r.values).toMatchObject({
      intent: "rent",
      propertyType: "rental",
      bedrooms: 2,
      stateCode: "LA",
      city: "Lagos",
      area: "Yaba",
      rentPeriod: "year",
      prepaidMeter: true,
      waterSupply: "BOREHOLE",
      title: "2 bedroom flat in Yaba",
    });
    expect(r.kobo).toMatchObject({
      rentNaira: 150_000_000,
      agencyFeeNaira: 15_000_000,
      legalFeeNaira: 15_000_000,
      cautionDepositNaira: 20_000_000,
    });
    expect(r.values.rentNaira).toBe("1500000");
    expect(r.notCarried.map((n) => n.text)).toEqual(
      expect.arrayContaining(["Serious clients only", "Gated or estate security"]),
    );
    expect(String(r.values.description)).not.toMatch(/serious clients/i);
    assertDraftable(r);
  });

  it("2. a mini flat in Surulere, figures before labels", () => {
    const r = parseBroadcast(
      "MINI FLAT FOR RENT\nLocation: Surulere\nRent: 650k per annum\n10% agency, 10% legal\nCaution: 100k\nCall 08031234567",
    );
    expect(r.values).toMatchObject({ bedrooms: 1, area: "Surulere", propertyType: "rental", title: "Mini flat in Surulere" });
    expect(r.kobo).toMatchObject({
      rentNaira: 65_000_000,
      agencyFeeNaira: 6_500_000,
      legalFeeNaira: 6_500_000,
      cautionDepositNaira: 10_000_000,
    });
    expect(r.notCarried).toEqual(expect.arrayContaining([{ kind: "phone", text: "08031234567" }]));
    /* The contact word goes with the number: no lone "Call" is reported. */
    expect(r.notCarried.some((n) => /^call$/i.test(n.text))).toBe(false);
    assertDraftable(r);
  });

  it("3. a self contain in Akoka is filed under Yaba only if Yaba is named", () => {
    const r = parseBroadcast("Self contain available at Akoka. Rent N450,000 yearly. Agent fee 50k. Prepaid.");
    expect(r.values.bedrooms).toBe(0);
    expect(r.values.area).toBeUndefined();
    expect(r.values.stateCode).toBeUndefined();
    expect(r.kobo).toMatchObject({ rentNaira: 45_000_000, agencyFeeNaira: 5_000_000 });
    expect(r.values.title).toBe("Self contain");
    assertDraftable(r);
  });

  it("4. a Lekki Phase 1 three bed with service charge and a total package", () => {
    const r = parseBroadcast(
      "3 bedroom apartment, Lekki Phase 1\nRent: 6m\nService charge: 1.2m\nAgency & legal 10% each\nCaution 500k\nTotal package 8.9m\nInverter, generator, 24hrs security",
    );
    expect(r.values.area).toBe("Lekki Phase 1");
    expect(r.kobo).toMatchObject({
      rentNaira: 600_000_000,
      serviceChargeNaira: 120_000_000,
      agencyFeeNaira: 60_000_000,
      legalFeeNaira: 60_000_000,
      cautionDepositNaira: 50_000_000,
      totalMoveInNaira: 890_000_000,
    });
    expect(r.values.powerBackup).toBe("GENERATOR_INVERTER");
    assertDraftable(r);
  });

  it("5. 'agency and legal 10%' without 'each' is reported, never split", () => {
    const r = parseBroadcast("2 bed flat Gbagada. Rent 2m. Agency and legal 10%. Caution 200k");
    expect(r.kobo.agencyFeeNaira).toBeUndefined();
    expect(r.kobo.legalFeeNaira).toBeUndefined();
    expect(r.notCarried.some((n) => n.kind === "ambiguous")).toBe(true);
    expect(r.kobo.rentNaira).toBe(200_000_000);
    assertDraftable(r);
  });

  it("6. a percentage with no rent to be a share of is reported, not resolved", () => {
    const r = parseBroadcast("Newly built 4 bedroom duplex in Magodo. Agency 10%. Legal 10%. Price on request.");
    expect(r.kobo.agencyFeeNaira).toBeUndefined();
    expect(r.notCarried.filter((n) => n.kind === "noBase")).toHaveLength(2);
    expect(r.values.propertyType).toBe("rental");
    expect(r.values.bedrooms).toBe(4);
    assertDraftable(r);
  });

  it("7. a sale in Ikoyi with C of O, fees on the sale side", () => {
    const r = parseBroadcast(
      "FOR SALE: 5 bedroom detached duplex, Ikoyi. C of O. Asking price N95m. Agency 5%, legal 5%. Slightly negotiable.",
    );
    expect(r.values).toMatchObject({ intent: "sale", propertyType: "home", priceNegotiable: true, area: "Ikoyi" });
    expect(r.kobo).toMatchObject({
      salePriceNaira: 9_500_000_000,
      saleAgencyFeeNaira: 475_000_000,
      saleLegalFeeNaira: 475_000_000,
    });
    expect(r.kobo.rentNaira).toBeUndefined();
    expect(r.values.title).toBe("5 bedroom house in Ikoyi for sale");
    assertDraftable(r);
  });

  it("8. a Wuse 2 shortlet by the night", () => {
    const r = parseBroadcast("Shortlet 1 bedroom apartment in Wuse 2, Abuja. 85k per night. Caution 50k. Fully furnished, 24/7 light, wifi.");
    expect(r.values).toMatchObject({ propertyType: "shortlet", area: "Wuse 2", stateCode: "FC", city: "Abuja", furnished: "fully_furnished" });
    expect(r.kobo.rateNaira).toBe(8_500_000);
    expect(r.kobo.rentNaira).toBeUndefined();
    assertDraftable(r);
  });

  it("9. a Gwarinpa three bed quoted per month is kept per month", () => {
    const r = parseBroadcast("3 bedroom flat Gwarinpa\n₦350,000 per month\nCaution 1 month\nBorehole");
    expect(r.values.area).toBe("Gwarinpa");
    expect(r.kobo.rentNaira).toBe(35_000_000);
    expect(r.values.rentPeriod).toBe("month");
    expect(r.values.waterSupply).toBe("BOREHOLE");
    expect(r.kobo.cautionDepositNaira).toBeUndefined();
    assertDraftable(r);
  });

  it("10. an account number and a WhatsApp line are stripped and listed", () => {
    const r = parseBroadcast(
      "Room and parlour self contain? No: room & parlour at Ogba. 500k/yr. Pay inspection fee 5k to 0123456789 GTB. WhatsApp 0812 345 6789",
    );
    expect(r.notCarried.some((n) => n.kind === "account" && n.text === "0123456789")).toBe(true);
    expect(r.notCarried.some((n) => n.kind === "phone")).toBe(true);
    expect(JSON.stringify(r.values)).not.toContain("0123456789");
    expect(JSON.stringify(r.values)).not.toMatch(/inspection fee/i);
    expect(r.kobo.rentNaira).toBe(50_000_000);
    assertDraftable(r);
  });

  it("11. a plain figure with no label and no period is not taken as rent", () => {
    const r = parseBroadcast("Lovely 2 bedroom flat in Ilupeju, 1.8m, call for details");
    expect(r.kobo.rentNaira).toBeUndefined();
    expect(r.values.bedrooms).toBe(2);
    assertDraftable(r);
  });

  it("12. a Victoria Island office, VI shorthand", () => {
    const r = parseBroadcast("Office space in VI, 150sqm, rent 25m p.a, service charge 5m, agency 10%, legal 10%");
    expect(r.values).toMatchObject({ propertyType: "office", area: "Victoria Island", stateCode: "LA" });
    expect(r.kobo).toMatchObject({
      rentNaira: 2_500_000_000,
      serviceChargeNaira: 500_000_000,
      agencyFeeNaira: 250_000_000,
      legalFeeNaira: 250_000_000,
    });
    assertDraftable(r);
  });

  it("13. land in Sangotedo for sale", () => {
    const r = parseBroadcast("Plot of land for sale at Sangotedo, Ajah axis. Governor's consent. Price: 35m. Negotiable");
    expect(r.values).toMatchObject({ intent: "sale", propertyType: "land", priceNegotiable: true });
    expect(r.kobo.salePriceNaira).toBe(3_500_000_000);
    assertDraftable(r);
  });

  it("14. an Ikeja GRA four bed with bathrooms, toilets and parking", () => {
    const r = parseBroadcast(
      "Tastefully finished 4 bedroom terrace duplex, Ikeja GRA. 4 baths, 5 toilets, parking for 3 cars. Rent: N7.5m/yr. Agency: 750k. Legal: 750k. Caution: 750k. Band A light, inverter. Non negotiable.",
    );
    expect(r.values).toMatchObject({
      area: "Ikeja GRA",
      bedrooms: 4,
      bathrooms: 4,
      toilets: "5",
      parkingSpaces: "3",
      powerGrid: "BAND_A",
      powerBackup: "INVERTER",
      rentNegotiable: false,
    });
    expect(r.kobo).toMatchObject({
      rentNaira: 750_000_000,
      agencyFeeNaira: 75_000_000,
      legalFeeNaira: 75_000_000,
      cautionDepositNaira: 75_000_000,
    });
    assertDraftable(r);
  });

  it("15. a Maitama message in capitals with +234 numbers", () => {
    const r = parseBroadcast(
      "LUXURY 3 BEDROOM SERVICED APARTMENT, MAITAMA ABUJA. RENT: 12M PER ANNUM. SERVICE CHARGE: 3M. AGENCY 10%. LEGAL 10%. CONTACT +234 803 123 4567",
    );
    expect(r.values).toMatchObject({ area: "Maitama", stateCode: "FC", bedrooms: 3 });
    expect(r.kobo).toMatchObject({
      rentNaira: 1_200_000_000,
      serviceChargeNaira: 300_000_000,
      agencyFeeNaira: 120_000_000,
      legalFeeNaira: 120_000_000,
    });
    expect(r.notCarried.some((n) => n.kind === "phone")).toBe(true);
    expect(r.notCarried.some((n) => n.text === "Serviced")).toBe(true);
    assertDraftable(r);
  });

  it("16. an agreement fee stated as a figure and a total that is all-in", () => {
    const r = parseBroadcast("2 bedroom flat, Ogudu. Rent 1.8m. Agency 180k. Agreement 90k. Caution 180k. All in: 2.25m");
    expect(r.kobo).toMatchObject({
      rentNaira: 180_000_000,
      agencyFeeNaira: 18_000_000,
      agreementFeeNaira: 9_000_000,
      cautionDepositNaira: 18_000_000,
      totalMoveInNaira: 225_000_000,
    });
    assertDraftable(r);
  });

  it("18. a figure above the draft's ceiling is handed back, never trimmed", () => {
    const r = parseBroadcast("FOR SALE: mansion on Banana Island. Asking price N2.5b. Agency 5%.");
    expect(r.kobo.salePriceNaira).toBeUndefined();
    expect(r.notCarried.some((n) => n.kind === "tooLarge")).toBe(true);
    assertDraftable(r);
  });

  it("17. a message that is not a listing fills nothing it cannot prove", () => {
    const r = parseBroadcast("Good morning everyone, God bless your hustle today");
    expect(r.kobo).toEqual({});
    expect(r.values.title).toBeUndefined();
    expect(r.values.area).toBeUndefined();
    assertDraftable(r);
  });
});

describe("every money key is a key the submit gate checks", () => {
  it("names only draft fields", () => {
    const keys = schemaKeys();
    for (const key of BROADCAST_MONEY_KEYS) expect(keys.has(key)).toBe(true);
  });
});
