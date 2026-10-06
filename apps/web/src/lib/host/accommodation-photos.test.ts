import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";

import { accommodationPhotoIdSchema, accommodationPhotoSchema } from "./schema";
import { documentPathBelongsTo, emptyHostDraft, missingFrom } from "./onboarding";
import { nextPhotoPosition } from "./photos";

/* The field messages the server action builds the schema from, in English. */
const W = getDictionary("en").experienceHost.refusals.schema;

/**
 * THE GATE THAT COULD NOT BE PASSED.
 *
 * `missingFrom` has always refused to submit an accommodation with no
 * photograph, and until `addAccommodationPhoto` existed nothing in the
 * application could put one on record: the table, the bucket, its four storage
 * policies and the catalogue trigger were built in M3 and had no writer. So
 * every hotel and every shortlet host filled in nine steps and could never
 * press send.
 *
 * These are the rules that close it, in the form a machine can check: the gate
 * clears when a photograph is on record and not before, the boundary refuses a
 * path that is not the caller's own, and a new photograph takes the slot the
 * unique index expects.
 */

const UUID = "00000000-0000-4000-8000-000000000001";
const OWNER = "00000000-0000-4000-8000-0000000000aa";

/** A shortlet application that is complete apart from its photographs. */
function shortletDraft(photos: { id: string; url: string }[]) {
  return {
    ...emptyHostDraft(),
    hostType: "individual" as const,
    kind: "shortlet_operator" as const,
    name: "Ada's Place",
    phone: "+2348031234567",
    address: "12 Admiralty Way",
    city: "Lagos",
    stateCode: "LA",
    representativeName: "Ada Obi",
    representativePhone: "+2348031234567",
    documents: { identity: true as const },
    accommodation: {
      id: UUID,
      name: "Ada's Place",
      hasPin: true,
      photos,
      facilities: [],
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
      accuracy: "2026-09-22T08:00:00Z",
      terms: "2026-09-22T08:00:00Z",
      processing: "2026-09-22T08:00:00Z",
    },
  };
}

describe("the accommodation photograph gate", () => {
  it("blocks an otherwise complete shortlet that has no photograph", () => {
    expect(missingFrom(shortletDraft([]))).toEqual(["At least one photo of the property"]);
  });

  it("clears once one photograph is on record, which is what was impossible", () => {
    const withOne = shortletDraft([{ id: "p1", url: "/brand/photos/bedroom-01.jpg" }]);
    expect(missingFrom(withOne)).toEqual([]);
  });
});

describe("accommodationPhotoSchema", () => {
  it("takes the property and the stored path", () => {
    const parsed = accommodationPhotoSchema(W).safeParse({
      accommodationId: UUID,
      storagePath: `${OWNER}/${UUID}/a.jpg`,
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses a property that is not an id", () => {
    const parsed = accommodationPhotoSchema(W).safeParse({
      accommodationId: "the one with the blue door",
      storagePath: `${OWNER}/${UUID}/a.jpg`,
    });
    expect(parsed.success).toBe(false);
  });

  it("refuses an empty path rather than recording a row pointing at nothing", () => {
    const parsed = accommodationPhotoSchema(W).safeParse({
      accommodationId: UUID,
      storagePath: "   ",
    });
    expect(parsed.success).toBe(false);
  });

  it("names a photograph for removal by its id only", () => {
    expect(accommodationPhotoIdSchema(W).safeParse({ photoId: UUID }).success).toBe(true);
    expect(accommodationPhotoIdSchema(W).safeParse({ photoId: "p1" }).success).toBe(false);
  });
});

describe("the uid prefix the action re-checks", () => {
  /* Storage RLS enforces the same rule on the upload itself, so a path that
     fails here was never written by this person. The action checks it again
     before any row is written, because the path arrives as a string. */
  it("accepts the caller's own folder", () => {
    expect(documentPathBelongsTo(OWNER, `${OWNER}/${UUID}/a.jpg`)).toBe(true);
  });

  it("refuses somebody else's folder", () => {
    expect(documentPathBelongsTo(OWNER, `00000000-0000-4000-8000-0000000000bb/x.jpg`)).toBe(false);
  });
});

describe("where a property's new photograph lands", () => {
  /* The same rule as the venue spine, and deliberately the same function:
     position is unique per accommodation and 0 is the cover in the catalogue
     projection, which reads the lowest position as the stay's picture. */
  it("makes the first photograph the cover", () => {
    expect(nextPhotoPosition([])).toBe(0);
  });

  it("promotes the next upload into a cover that was taken down", () => {
    expect(nextPhotoPosition([1, 2])).toBe(0);
  });
});
