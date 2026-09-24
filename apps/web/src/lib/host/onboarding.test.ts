import { describe, expect, it } from "vitest";
import {
  CAC_NUMBER_RE,
  CONSENTS,
  DOCUMENT_SPECS,
  documentPathBelongsTo,
  emptyHostDraft,
  missingFrom,
  progressLabel,
  rejectFile,
  stepsFor,
  type HostDraft,
} from "./onboarding";

/**
 * The host wizard's model, pinned.
 *
 * Two things here decide what a person SEES: how many steps they are told
 * they have, and what the review screen prints as missing. Both branch on
 * the host type, and a branch that quietly drops a step or a blocking rule is
 * how a restaurant ends up on the shelf with no service window.
 */
function complete(over: Partial<HostDraft> = {}): HostDraft {
  return {
    ...emptyHostDraft(),
    hostType: "individual",
    kind: "shortlet_operator",
    name: "Ada's Place",
    phone: "+2348031234567",
    address: "12 Admiralty Way",
    city: "Lagos",
    stateCode: "LA",
    representativeName: "Ada Obi",
    representativePhone: "+2348031234567",
    documents: { identity: true },
    accommodation: {
      id: "a",
      name: "Ada's Place",
      hasPin: true,
      photos: [
        { id: "p1", url: "/brand/photos/bedroom-01.jpg" },
        { id: "p2", url: "/brand/photos/bedroom-02.jpg" },
        { id: "p3", url: "/brand/photos/bedroom-03.jpg" },
      ],
      facilities: ["wifi", "generator"],
      starRating: null,
      checkInFrom: "14:00",
      checkOutBy: "11:00",
      houseRules: "",
      cancellationPolicyId: null,
    },
    roomTypeCount: 1,
    ratePlanCount: 1,
    roomTypes: [
      {
        id: "rt1",
        name: "The whole flat",
        sleeps: 4,
        unitsTotal: 1,
        rateCount: 1,
        category: "entire_flat",
        baseRateMinor: 8_500_000,
        rates: [{ id: "rp1", name: "Room only", mealPlan: "room_only", rateMinor: 8_500_000 }],
        beds: { bedrooms: 2, beds: 3 },
      },
    ],
    hasBankAccount: true,
    consents: {
      accuracy: "2026-09-18T08:00:00Z",
      terms: "2026-09-18T08:00:00Z",
      processing: "2026-09-18T08:00:00Z",
    },
    ...over,
  };
}

describe("stepsFor", () => {
  it("shows the honest count before the branch is known", () => {
    expect(stepsFor(null).map((s) => s.id)).toEqual([
      "host-type",
      "business",
      "payout",
      "consent",
      "review",
    ]);
  });

  it("gives an individual host the hotel's drawn steps when no kind is known", () => {
    /* `GOVERNING-10` is the default because it is the branch that asks the
       most: somebody whose kind we have not been told yet is shown the fuller
       flow rather than the shorter one. */
    expect(stepsFor("individual").map((s) => s.id)).toEqual([
      "host-type",
      "business",
      "representative",
      "hotel",
      "room-types",
      "rates",
      "facilities",
      "payout",
      "consent",
      "review",
    ]);
  });

  it("gives a shortlet operator the two screens GOVERNING-11 draws", () => {
    const ids = stepsFor("individual", "shortlet_operator").map((s) => s.id);
    expect(ids).toEqual([
      "host-type",
      "business",
      "representative",
      "place",
      "house-rules",
      "facilities",
      "payout",
      "consent",
      "review",
    ]);
    /* A shortlet host is never asked a hotelier's questions. */
    expect(ids).not.toContain("hotel");
    expect(ids).not.toContain("room-types");
    expect(ids).not.toContain("rates");
  });

  it("branches on the kind and not on the host type alone", () => {
    /* A shortlet operator may be a registered company, and is still letting a
       flat rather than running a hotel. */
    const ids = stepsFor("business", "shortlet_operator").map((s) => s.id);
    expect(ids).toContain("registration");
    expect(ids).toContain("place");
    expect(ids).not.toContain("hotel");
  });

  it("gives a registered business one more step, the papers", () => {
    const ids = stepsFor("business").map((s) => s.id);
    expect(ids).toContain("registration");
    expect(ids.length).toBe(stepsFor("individual").length + 1);
  });

  it("gives a restaurant its two drawn screens instead of rooms", () => {
    const ids = stepsFor("restaurant").map((s) => s.id);
    expect(ids).toContain("restaurant");
    expect(ids).toContain("tables");
    expect(ids).not.toContain("hotel");
    expect(ids).not.toContain("place");
    expect(ids).not.toContain("room-types");
    expect(ids).not.toContain("registration");
  });

  it("always ends with payout, consent and review", () => {
    for (const type of ["individual", "business", "restaurant"] as const) {
      expect(stepsFor(type).slice(-3).map((s) => s.id)).toEqual(["payout", "consent", "review"]);
    }
  });
});

describe("progressLabel", () => {
  it("is one-based", () => {
    expect(progressLabel(0, 8)).toBe("Step 1 of 8");
  });
});

describe("missingFrom", () => {
  it("asks for the host type first and nothing else", () => {
    expect(missingFrom(emptyHostDraft())).toEqual(["What kind of host you are"]);
  });

  it("is empty for a complete individual host", () => {
    expect(missingFrom(complete())).toEqual([]);
  });

  it("names the pin and the photos separately", () => {
    const missing = missingFrom(
      complete({
        accommodation: {
          id: "a",
          name: "x",
          hasPin: false,
          photos: [],
          facilities: [],
          starRating: null,
          checkInFrom: "14:00",
          checkOutBy: "11:00",
          houseRules: "",
          cancellationPolicyId: null,
        },
      }),
    );
    expect(missing).toContain("The pin on the map");
    expect(missing).toContain("At least one photo of the property");
  });

  it("demands the papers on the business branch only", () => {
    const business = missingFrom(complete({ hostType: "business" }));
    expect(business).toContain("Registered business name");
    expect(business).toContain("CAC registration number");
    expect(business).toContain(DOCUMENT_SPECS.registration.title);
    expect(missingFrom(complete({ hostType: "individual" }))).not.toContain(
      "CAC registration number",
    );
  });

  it("demands a window, a price band and the hygiene attestation from a restaurant", () => {
    const restaurant = missingFrom(
      complete({
        hostType: "restaurant",
        kind: "restaurant",
        accommodation: null,
        roomTypeCount: 0,
        ratePlanCount: 0,
      }),
    );
    expect(restaurant).toEqual([
      "A price band",
      "At least one service window",
      "The health permit attestation",
      "At least one photo of the restaurant",
    ]);
  });

  it("SUP-17: a restaurant is not submitted without a photograph, and is with one", () => {
    const base = {
      hostType: "restaurant" as const,
      kind: "restaurant" as const,
      accommodation: null,
      roomTypeCount: 0,
      ratePlanCount: 0,
      restaurant: { priceBand: 2, cuisineCount: 1, cuisines: ["nigerian"] },
      serviceWindowCount: 1,
      hygieneAttestedAt: "2026-09-18T08:00:00Z",
    };
    expect(missingFrom(complete({ ...base, businessPhotoCount: 0 }))).toEqual(["At least one photo of the restaurant"]);
    expect(missingFrom(complete({ ...base, businessPhotoCount: 1 }))).toEqual([]);
  });

  it("prints each missing consent by its own label, never one bundled line", () => {
    const missing = missingFrom(complete({ consents: { accuracy: "2026-09-18T08:00:00Z" } }));
    expect(missing).toEqual([CONSENTS[1]!.label, CONSENTS[2]!.label]);
  });

  it("blocks on the bank account, because the payout promise is structural", () => {
    expect(missingFrom(complete({ hasBankAccount: false }))).toEqual([
      "A bank account for payouts",
    ]);
  });
});

describe("CAC_NUMBER_RE", () => {
  it("accepts the shapes people actually type", () => {
    for (const value of ["RC1234567", "rc 1234567", "BN-123456", "1234567", "IT 12345"]) {
      expect(CAC_NUMBER_RE.test(value)).toBe(true);
    }
  });

  it("refuses letters in the number and too few digits", () => {
    for (const value of ["RC12AB567", "RC123", "hello", ""]) {
      expect(CAC_NUMBER_RE.test(value)).toBe(false);
    }
  });
});

describe("documentPathBelongsTo", () => {
  it("accepts only the caller's own folder", () => {
    expect(documentPathBelongsTo("u1", "u1/batch/id.jpg")).toBe(true);
    expect(documentPathBelongsTo("u1", "u2/batch/id.jpg")).toBe(false);
    expect(documentPathBelongsTo("u1", "u10/batch/id.jpg")).toBe(false);
    expect(documentPathBelongsTo("u1", "")).toBe(false);
  });
});

describe("rejectFile", () => {
  it("names the limit before anything is uploaded", () => {
    expect(rejectFile({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(rejectFile({ type: "image/gif", size: 1024 })).toContain("JPG, PNG, WEBP, HEIC or PDF");
    expect(rejectFile({ type: "image/jpeg", size: 9 * 1024 * 1024 })).toContain("8MB");
  });
});
