import { describe, expect, it } from "vitest";
import { queryIsPlaceName, resolveCity, cityForFilter } from "./mapping";

/**
 * The query we actually send to Google, which was asking for the wrong thing.
 *
 * `textQuery` built "<q or subject> in <resolved city>, Nigeria", and the free
 * text was used TWICE: once by `cityForFilter` to choose where to search, and
 * again as the thing to search for. So the most ordinary search anybody makes
 * here, a bare city name, went out as:
 *
 *     textQuery:    "Lagos in Lagos, Nigeria"
 *     includedType: "lodging"
 *
 * Google answered 200 with an empty list, because the one thing in Lagos
 * actually named "Lagos" is the locality, and a locality is not lodging.
 *
 * That is the worst shape a bug can have. The key was valid, the API was
 * enabled, the call succeeded in 260ms, the provider reported `outcome: "ok"`,
 * and the shelf was empty. Every one of those signals says healthy. It is
 * indistinguishable from a city that genuinely has no hotels, which is exactly
 * how it read, and it sat behind two credential failures that had to be cleared
 * before anybody could even see it.
 *
 * These tests hold the rule that fixes it: a query which is a place and nothing
 * else is a LOCATION, and the category supplies the subject.
 */

describe("queryIsPlaceName", () => {
  it("is true for a bare city", () => {
    expect(queryIsPlaceName("Lagos")).toBe(true);
    expect(queryIsPlaceName("  lagos  ")).toBe(true);
    expect(queryIsPlaceName("ABUJA")).toBe(true);
  });

  /*
   * The whole point of matching the WHOLE query rather than a substring. Both
   * of these name a city and neither is a location: they are things to look
   * for, and turning them into "hotels in eko hotel, Nigeria" would be a second
   * version of the same bug.
   */
  it("is false for a query that merely mentions a city", () => {
    expect(queryIsPlaceName("eko hotel")).toBe(false);
    expect(queryIsPlaceName("Lagos hotels")).toBe(false);
    expect(queryIsPlaceName("cheap flats in Lagos")).toBe(false);
  });

  it("is false for nothing at all", () => {
    expect(queryIsPlaceName(undefined)).toBe(false);
    expect(queryIsPlaceName("")).toBe(false);
    expect(queryIsPlaceName("   ")).toBe(false);
  });

  /* A state name is a place too, and reaches the same city. */
  it("accepts a state as readily as its capital", () => {
    const byState = resolveCity("Rivers");
    expect(byState).not.toBeNull();
    expect(queryIsPlaceName("Rivers")).toBe(true);
  });
});

/**
 * The two readings of a query have to stay separate. `cityForFilter` decides
 * WHERE and it is right to match a city named anywhere in the text;
 * `queryIsPlaceName` decides WHAT and must not.
 */
describe("where and what are different questions", () => {
  it("a venue name still searches the city it implies", () => {
    expect(cityForFilter({ q: "eko hotel" }).name.length).toBeGreaterThan(0);
    expect(queryIsPlaceName("eko hotel")).toBe(false);
  });

  it("a bare city resolves as a place and as a location", () => {
    expect(resolveCity("Lagos")).not.toBeNull();
    expect(queryIsPlaceName("Lagos")).toBe(true);
  });

  /*
   * Substring collisions the city matcher already had to defend against. If any
   * of these came back true, a bare "Taraba" search would be rewritten into a
   * subject-less query aimed at the wrong state.
   */
  it("is not fooled by a city name sitting inside another word", () => {
    expect(queryIsPlaceName("Tarabaa")).toBe(false);
    expect(queryIsPlaceName("Asabaa")).toBe(false);
  });
});
