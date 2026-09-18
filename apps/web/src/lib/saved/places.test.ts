import { describe, expect, it } from "vitest";

import { isSaved, partitionByKind, savedKeySet, savedPlaceKey, staysSide } from "./places";

/**
 * A heart has to light for the right card and only that card: the same uuid
 * can be an accommodation on one shelf and, by coincidence of tables, a
 * listing on another.
 */
describe("saved places, the pure half", () => {
  const places = [
    { entityKind: "accommodation" as const, entityId: "A1", savedAt: "2026-09-18T10:00:00Z" },
    { entityKind: "restaurant" as const, entityId: "r1", savedAt: "2026-09-18T09:00:00Z" },
    { entityKind: "listing" as const, entityId: "l1", savedAt: "2026-09-18T08:00:00Z" },
  ];

  it("keys on kind and id, case-insensitively on the id", () => {
    expect(savedPlaceKey({ entityKind: "accommodation", entityId: "A1" })).toBe("accommodation:a1");
    const keys = savedKeySet(places);
    expect(isSaved(keys, "accommodation", "a1")).toBe(true);
    expect(isSaved(keys, "listing", "a1")).toBe(false);
    expect(isSaved(keys, "restaurant", "R1")).toBe(true);
  });

  it("splits a mixed list by kind, keeping order and every kind present", () => {
    const parts = partitionByKind(places);
    expect(parts.accommodation.map((p) => p.entityId)).toEqual(["A1"]);
    expect(parts.restaurant.map((p) => p.entityId)).toEqual(["r1"]);
    expect(parts.listing.map((p) => p.entityId)).toEqual(["l1"]);
    expect(partitionByKind([]).restaurant).toEqual([]);
  });

  it("keeps only the Stays side when asked", () => {
    expect(staysSide(places).map((p) => p.entityKind)).toEqual(["accommodation", "restaurant"]);
  });
});
