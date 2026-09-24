import { describe, expect, it } from "vitest";
import {
  EMPTY_SERVICE_FORM,
  isServiced,
  matchesService,
  readService,
  serviceColumns,
  serviceFormOf,
  servicePayload,
} from "./service";
import { matchesFacts, type ListingFacts } from "./filter";

describe("Serviced, defined (V-68)", () => {
  it("is earned only by power, water and security together", () => {
    expect(isServiced(["diesel", "water", "security"])).toBe(true);
    expect(isServiced(["diesel", "water", "security", "lift"])).toBe(true);
    expect(isServiced(["security", "cleaning"])).toBe(false);
    expect(isServiced(undefined)).toBe(false);
  });

  it("reads only known answers, and nothing as null", () => {
    expect(readService(null)).toBeNull();
    expect(readService({ service_charge_covers: null, estate_type: "moat" })).toBeNull();
    expect(readService({ service_charge_covers: ["water", "jacuzzi", "diesel", "security"] })).toEqual({
      covers: ["diesel", "water", "security"],
      serviced: true,
    });
    expect(readService({ service_charge_covers: [] })).toEqual({ covers: [], serviced: false });
  });

  it("filters strictly on Serviced and the gated estate", () => {
    expect(matchesService(undefined, { servicedOnly: true })).toBe(false);
    expect(matchesService({ serviced: false, covers: ["security"] }, { servicedOnly: true })).toBe(false);
    expect(matchesService({ serviced: true }, { servicedOnly: true })).toBe(true);
    expect(matchesService({ serviced: false, estateType: "gated_compound" }, { gatedEstate: true })).toBe(false);
    expect(matchesService({ serviced: false, estateType: "gated_estate" }, { gatedEstate: true })).toBe(true);
    const facts = { kind: "rental", priceMinor: 1, bedrooms: 1, bathrooms: 1, amenities: [], instantBook: false, verified: false, isDemo: false, source: "first-party" } as unknown as ListingFacts;
    expect(matchesFacts(facts, { servicedOnly: true })).toBe(false);
  });

  it("round trips the wizard; an untouched cover list stays unanswered", () => {
    expect(servicePayload(EMPTY_SERVICE_FORM)).toEqual({
      serviceChargeCovers: null,
      serviceChargeReconciled: null,
      estateType: null,
    });
    const form = serviceFormOf({ covers: [], reconciled: true, estateType: "open_street", serviced: false });
    expect(form.coversAnswered).toBe(true);
    expect(servicePayload(form)).toEqual({
      serviceChargeCovers: [],
      serviceChargeReconciled: true,
      estateType: "open_street",
    });
    expect(serviceColumns({ estateType: null })).toEqual({ estate_type: null });
  });
});
