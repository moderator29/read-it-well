import { describe, expect, it } from "vitest";

import { STAYS_DOORS, doorFrom } from "./doors";
import { HOST_TYPE_DEFINITIONS, stepsFor } from "./onboarding";

/**
 * THE THREE STAYS DOORS, and the one thing that could quietly break them.
 *
 * A door answers the wizard's first two questions on a host's behalf: the host
 * type, which decides which proof is asked for, and the business kind, which
 * decides what the rows mean. If a door ever named a kind its host type is not
 * allowed to pick, the wizard would open on the second step carrying an answer
 * its own first step would have refused, and nothing on the screen would say
 * so. That is what the first test here exists to prevent.
 */
describe("the stays doors", () => {
  it("offers a hotel, a shortlet and a restaurant, in that order", () => {
    expect(STAYS_DOORS.map((door) => door.id)).toEqual(["hotel", "shortlet", "restaurant"]);
  });

  it("never names a business kind its own host type may not pick", () => {
    for (const door of STAYS_DOORS) {
      expect(HOST_TYPE_DEFINITIONS[door.hostType].kinds).toContain(door.kind);
    }
  });

  it("sends the hotel down the registered branch and the shortlet down the individual one", () => {
    /* The research is plain about why: an individual letting a furnished flat
       may hold no CAC registration at all, and demanding one would cut out
       most of the real Nigerian shortlet supply, while the render's own hotel
       screen asks for an RC number. */
    const hotel = doorFrom("hotel");
    const shortlet = doorFrom("shortlet");
    expect(stepsFor(hotel!.hostType).map((step) => step.id)).toContain("registration");
    expect(stepsFor(shortlet!.hostType).map((step) => step.id)).not.toContain("registration");
  });

  it("sends the restaurant to tables rather than to rooms", () => {
    const steps = stepsFor(doorFrom("restaurant")!.hostType).map((step) => step.id);
    expect(steps).toContain("service");
    expect(steps).not.toContain("rooms");
  });

  it("refuses anything that is not one of the three", () => {
    expect(doorFrom("hotels")).toBeNull();
    expect(doorFrom("")).toBeNull();
    expect(doorFrom(null)).toBeNull();
    expect(doorFrom(undefined)).toBeNull();
  });
});
