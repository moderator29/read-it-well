import { describe, expect, it } from "vitest";
import { isPlausibleOrigin, spokenDistance, spokenDuration } from "./travel-time";

/**
 * The parts of a travel time that do not need a network.
 *
 * The fetch itself is proved by the same argument as the partner providers: it
 * either answers or it does not, and every failure is an outcome rather than a
 * throw. What is worth testing here is the arithmetic a person reads, because
 * these two functions are the difference between a number that is honest about
 * its own precision and one that is not.
 */

describe("a duration somebody would say out loud", () => {
  it("never rounds down to nothing", () => {
    // Somewhere two minutes away still takes a couple of minutes to reach, and
    // "0 min" next to a restaurant reads as a bug.
    expect(spokenDuration(0)).toBe("1 min");
    expect(spokenDuration(29)).toBe("1 min");
  });

  it("keeps the exact figure only while it is small enough to mean something", () => {
    expect(spokenDuration(60)).toBe("1 min");
    expect(spokenDuration(4 * 60)).toBe("4 min");
  });

  it("rounds to five minutes, because traffic is not predictable to the minute", () => {
    // 23 minutes claims a precision a traffic-aware estimate does not have.
    expect(spokenDuration(23 * 60)).toBe("25 min");
    expect(spokenDuration(47 * 60)).toBe("45 min");
    expect(spokenDuration(52 * 60)).toBe("50 min");
  });

  it("switches to hours past the hour", () => {
    expect(spokenDuration(60 * 60)).toBe("1 hr");
    expect(spokenDuration(75 * 60)).toBe("1 hr 15 min");
    expect(spokenDuration(95 * 60)).toBe("1 hr 30 min");
  });

  it("carries into the next hour rather than saying 60 min", () => {
    // 118 minutes rounds its remainder to 60, which must read as two hours.
    expect(spokenDuration(118 * 60)).toBe("2 hr");
  });
});

describe("a distance somebody would say out loud", () => {
  it("uses metres below a kilometre, rounded to fifty", () => {
    expect(spokenDistance(120)).toBe("100 m");
    expect(spokenDistance(780)).toBe("800 m");
  });

  it("never claims to be more precise than fifty metres", () => {
    // A geocode is not accurate to the metre, so "12 m away" is a false claim.
    expect(spokenDistance(0)).toBe("50 m");
    expect(spokenDistance(12)).toBe("50 m");
  });

  it("uses kilometres above that, with a decimal only while it matters", () => {
    expect(spokenDistance(1_400)).toBe("1.4 km");
    expect(spokenDistance(8_200)).toBe("8.2 km");
    expect(spokenDistance(24_000)).toBe("24 km");
  });
});

describe("the origin a browser handed us", () => {
  it("accepts a real position", () => {
    expect(isPlausibleOrigin({ lat: 6.4281, lng: 3.4219 })).toBe(true);
  });

  it("refuses null island, which is what a failed fix looks like", () => {
    // 0,0 is in the Gulf of Guinea. Accepting it costs a billed request and
    // returns a confident four hour drive from the sea.
    expect(isPlausibleOrigin({ lat: 0, lng: 0 })).toBe(false);
  });

  it("refuses anything that is not a finite coordinate", () => {
    expect(isPlausibleOrigin({ lat: Number.NaN, lng: 3.4 })).toBe(false);
    expect(isPlausibleOrigin({ lat: Infinity, lng: 3.4 })).toBe(false);
    expect(isPlausibleOrigin({ lat: 91, lng: 3.4 })).toBe(false);
    expect(isPlausibleOrigin({ lat: 6.4, lng: 181 })).toBe(false);
  });
});
