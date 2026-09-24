import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  EMPTY_COMPOUND_FORM,
  compoundColumns,
  compoundFacts,
  compoundFormOf,
  compoundPayload,
  isMissingColumnError,
  matchesCompound,
  readCompound,
} from "./compound";
import { matchesFacts, type ListingFacts } from "./filter";

const copy = getDictionary("en").shape.compound;

describe("the compound's five answers (V-28)", () => {
  it("reads only answers it knows how to say, and nothing as null", () => {
    expect(readCompound(null)).toBeNull();
    expect(readCompound({ parking_type: null, landlord_on_site: null })).toBeNull();
    expect(readCompound({ parking_type: "garage", flats_in_compound: 0 })).toBeNull();
    expect(
      readCompound({
        parking_type: "inside",
        flats_in_compound: 6,
        landlord_on_site: false,
        waste_disposal: "psp",
        car_access: true,
      }),
    ).toEqual({ parkingType: "inside", flatsInCompound: 6, landlordOnSite: false, wasteDisposal: "psp", carAccess: true });
  });

  it("says the answered ones in the order asked at the gate, and never an unanswered one", () => {
    const facts = compoundFacts({ landlordOnSite: true, flatsInCompound: 1, carAccess: false }, copy);
    expect(facts.map((f) => f.label)).toEqual([
      "The only home in the compound",
      "Landlord lives in the compound",
      "No car access into the compound",
    ]);
    expect(compoundFacts({ flatsInCompound: 8 }, copy)[0]!.label).toBe("8 homes share the compound");
    expect(compoundFacts(undefined, copy)).toEqual([]);
  });

  it("filters strictly: an unanswered listing never satisfies either filter", () => {
    expect(matchesCompound(undefined, { landlordAway: true })).toBe(false);
    expect(matchesCompound({ landlordOnSite: true }, { landlordAway: true })).toBe(false);
    expect(matchesCompound({ landlordOnSite: false }, { landlordAway: true })).toBe(true);
    expect(matchesCompound({ parkingType: "street" }, { parkingInside: true })).toBe(false);
    expect(matchesCompound({ parkingType: "inside" }, { parkingInside: true })).toBe(true);
    expect(matchesCompound(undefined, {})).toBe(true);
  });

  it("is judged by the same matchesFacts the drawer counts with", () => {
    const facts = { kind: "rental", priceMinor: 1, bedrooms: 1, bathrooms: 1, amenities: [], instantBook: false, verified: false, isDemo: false, source: "first-party" } as unknown as ListingFacts;
    expect(matchesFacts(facts, { landlordAway: true })).toBe(false);
    expect(matchesFacts({ ...facts, compound: { landlordOnSite: false } }, { landlordAway: true })).toBe(true);
  });

  it("round trips through the wizard, and unanswered clears the column", () => {
    const form = compoundFormOf({ parkingType: "street", landlordOnSite: false, flatsInCompound: 4 });
    expect(form).toEqual({ ...EMPTY_COMPOUND_FORM, parkingType: "street", landlordOnSite: "no", flatsInCompound: "4" });
    expect(compoundPayload(form)).toEqual({
      parkingType: "street",
      flatsInCompound: 4,
      landlordOnSite: false,
      wasteDisposal: null,
      carAccess: null,
    });
    expect(compoundPayload({ ...form, flatsInCompound: "0" }).flatsInCompound).toBeNull();
    expect(compoundColumns(compoundPayload(EMPTY_COMPOUND_FORM))).toEqual({
      parking_type: null,
      flats_in_compound: null,
      landlord_on_site: null,
      waste_disposal: null,
      car_access: null,
    });
    expect(compoundColumns({})).toEqual({});
  });

  it("treats only a missing column as saved", () => {
    expect(isMissingColumnError({ code: "42703" })).toBe(true);
    expect(isMissingColumnError({ code: "PGRST204" })).toBe(true);
    expect(isMissingColumnError({ code: "42501" })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
  });
});
