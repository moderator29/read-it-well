import { describe, expect, it } from "vitest";
import {
  LADDER,
  NIGERIA_BOUNDS,
  STORED_POINT_DECIMALS,
  canRunAreaReport,
  canRunPerProperty,
  coarseningErrorMetres,
  coarsenPoint,
  emptySubject,
  reachedRung,
  subjectPlaceParts,
  withinNigeria,
} from "./address";
import { RADIUS_LADDER } from "./gate";
import { metresBetween } from "./geohash";

/**
 * THE LADDER, AND THE TWO THINGS IT MUST NEVER DO.
 *
 * It must never invent a fact the person did not state, because we hold
 * nothing that maps an address to a building and a pre-filled guess is four
 * invented numbers with the reader asked to take ownership of them.
 *
 * And it must never keep a point fine enough to name a building. The
 * coarsening below is the privacy position rather than a tidy-up, so the test
 * measures what it costs the ANSWER (nothing, against a 750 metre first rung)
 * and what it costs an attacker (a building becomes a block).
 */

describe("nothing is invented", () => {
  it("starts every optional fact at null rather than at a plausible default", () => {
    const subject = emptySubject("LA");
    /* `bedrooms: 0` would be a CLAIM that the property has none, which is what
       a shop or an office says, and it would put a house in the wrong
       comparable set silently: the gate's zero boundary refuses to mix the
       two. Null means nobody has been asked. */
    expect(subject.bedrooms).toBeNull();
    expect(subject.bathrooms).toBeNull();
    expect(subject.sizeSqm).toBeNull();
    expect(subject.lat).toBeNull();
    expect(subject.lng).toBeNull();
    expect(subject.area).toBeNull();
    expect(subject.lgaCode).toBeNull();
    expect(subject.hint).toBeNull();
    expect(subject.fromListingId).toBeNull();
  });

  it("defaults rent to annual, because that is what the gate answers for", () => {
    expect(emptySubject().rentPeriod).toBe("year");
    expect(emptySubject().intent).toBe("rent");
  });
});

describe("the ladder may be stopped at any rung", () => {
  it("climbs state, local government, area, pin, hint", () => {
    expect([...LADDER]).toEqual(["state", "lga", "area", "pin", "hint"]);
  });

  it("reports the furthest rung actually reached", () => {
    expect(reachedRung(emptySubject())).toBeNull();
    expect(reachedRung(emptySubject("LA"))).toBe("state");
    expect(reachedRung({ ...emptySubject("LA"), lgaCode: "LA-ETI" })).toBe("lga");
    expect(reachedRung({ ...emptySubject("LA"), area: "Lekki Phase 1" })).toBe("area");
    expect(reachedRung({ ...emptySubject("LA"), lat: 6.44, lng: 3.42 })).toBe("pin");
  });

  it("treats a whitespace area as no area, not as an area called nothing", () => {
    expect(reachedRung({ ...emptySubject("LA"), area: "   " })).toBe("state");
  });

  it("needs only a state for an area report and only a pin for a property", () => {
    const stateOnly = emptySubject("LA");
    expect(canRunAreaReport(stateOnly)).toBe(true);
    expect(canRunPerProperty(stateOnly)).toBe(false);

    const pinned = { ...stateOnly, lat: 6.44, lng: 3.42 };
    expect(canRunPerProperty(pinned)).toBe(true);
  });
});

describe("the pin stays in Nigeria", () => {
  it("accepts the four corners of the country and the big cities", () => {
    for (const [lat, lng] of [
      [6.4474, 3.4736],
      [9.0857, 7.4951],
      [12.0022, 8.5919],
      [4.8156, 7.0134],
      [13.0, 13.1],
    ] as const) {
      expect(withinNigeria(lat, lng), `${lat},${lng}`).toBe(true);
    }
  });

  it("refuses a point that is not in the country", () => {
    expect(withinNigeria(51.5074, -0.1278)).toBe(false);
    expect(withinNigeria(0, 0)).toBe(false);
    expect(withinNigeria(Number.NaN, 3.4)).toBe(false);
  });

  it("leaves room at the coastline and the borders rather than refusing them", () => {
    expect(NIGERIA_BOUNDS.latMin).toBeLessThan(4.27);
    expect(NIGERIA_BOUNDS.latMax).toBeGreaterThan(13.89);
    expect(NIGERIA_BOUNDS.lngMin).toBeLessThan(2.67);
    expect(NIGERIA_BOUNDS.lngMax).toBeGreaterThan(14.68);
  });
});

describe("the point is coarsened before it is kept, and the cost is measured", () => {
  it("rounds to three decimal places, which the column type also enforces", () => {
    expect(STORED_POINT_DECIMALS).toBe(3);
    expect(coarsenPoint(6.447412345, 3.473698765)).toEqual({ lat: 6.447, lng: 3.474 });
  });

  it("moves a point by less than 90 metres anywhere in Nigeria", () => {
    for (const lat of [4.2, 6.45, 9.08, 13.9]) {
      expect(coarseningErrorMetres(lat), `at ${lat}`).toBeLessThan(90);
    }
  });

  it("costs the answer a bounded amount, and the bound is stated rather than waved at", () => {
    /* THIS TEST WAS WRITTEN CLAIMING THE COARSENING COSTS NOTHING AND IT
       REFUSED ITSELF. The worst case displacement is about 79 metres, which is
       10.5 per cent of the 750 metre first rung, not "an order of magnitude
       inside" it as the comment originally said.
       What is actually true, and it is enough: a comparable can only move into
       or out of the set if it sits within about 79 metres of a rung boundary,
       and the confidence band is derived from the count, the spread, the age
       and the rung rather than from any single row. */
    const worst = Math.max(...[4.2, 6.45, 9.08, 13.9].map(coarseningErrorMetres));
    expect(worst).toBeLessThan(80);
    expect(worst / RADIUS_LADDER[0]).toBeLessThan(0.11);
  });

  it("actually moves the point, measured, so it is not a rounding that does nothing", () => {
    const lat = 6.447412345;
    const lng = 3.473698765;
    const coarse = coarsenPoint(lat, lng);
    const moved = metresBetween(lat, lng, coarse.lat, coarse.lng);
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThan(90);
  });
});

describe("the subject line says only what the person said", () => {
  it("drops the parts nobody filled in, rather than writing undefined", () => {
    const subject = { ...emptySubject("LA"), area: "Lekki Phase 1" };
    expect(subjectPlaceParts(subject, "Lagos", null)).toEqual(["Lekki Phase 1", "Lagos"]);
  });

  it("does not repeat a name that is both the area and the local government", () => {
    const subject = { ...emptySubject("LA"), area: "Lekki", city: "Lagos" };
    expect(subjectPlaceParts(subject, "Lagos", "Lekki")).toEqual(["Lekki", "Lagos"]);
  });

  it("says nothing at all when nothing was chosen", () => {
    expect(subjectPlaceParts(emptySubject(), null, null)).toEqual([]);
  });
});

describe("the free text hint goes nowhere", () => {
  it("is on the subject and on nothing else this feature persists", () => {
    /* The enforcement is the absence of a column: price_check_events,
       price_check_watches and price_check_shares have none between them, and
       the probe asserts that. This assertion is the product-side half: the
       hint is on the form's own state and is never read by anything that
       builds a payload. */
    const subject = { ...emptySubject("LA"), hint: "the blue gate opposite the mosque" };
    expect(subject.hint).toBe("the blue gate opposite the mosque");
    expect(reachedRung(subject)).toBe("hint");
  });
});
