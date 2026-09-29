import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_FILL,
  METER_SEGMENTS,
  countFill,
  meterBars,
  meterFill,
  meterLevel,
  ratingFill,
} from "./meter";

describe("meterFill", () => {
  it("lights the share of ten bars a value is of its max", () => {
    expect(meterFill(78, 100)).toBe(8);
    expect(meterFill(50, 100)).toBe(5);
    expect(meterFill(100, 100)).toBe(10);
  });

  it("clamps to the track", () => {
    expect(meterFill(140, 100)).toBe(10);
    expect(meterFill(-3, 100)).toBe(0);
  });

  it("never draws an empty track for a real value above zero", () => {
    expect(meterFill(1, 100)).toBe(1);
  });

  it("draws nothing for zero, a missing max or a non-number", () => {
    expect(meterFill(0, 100)).toBe(0);
    expect(meterFill(5, 0)).toBe(0);
    expect(meterFill(Number.NaN, 100)).toBe(0);
    expect(meterFill(5, Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("honours another track length", () => {
    expect(meterFill(3, 4, 4)).toBe(3);
  });
});

describe("meterLevel", () => {
  it("reads thirds of the track", () => {
    expect(meterLevel(0)).toBe("none");
    expect(meterLevel(1)).toBe("low");
    expect(meterLevel(3)).toBe("low");
    expect(meterLevel(4)).toBe("mid");
    expect(meterLevel(6)).toBe("mid");
    expect(meterLevel(7)).toBe("high");
    expect(meterLevel(10)).toBe("high");
  });

  it("clamps what it is given", () => {
    expect(meterLevel(99)).toBe("high");
    expect(meterLevel(-1)).toBe("none");
  });
});

describe("meterBars", () => {
  it("returns ten bars with the lit ones first", () => {
    const bars = meterBars(8);
    expect(bars).toHaveLength(METER_SEGMENTS);
    expect(bars.filter(Boolean)).toHaveLength(8);
    expect(bars.slice(0, 8).every(Boolean)).toBe(true);
    expect(bars.slice(8).some(Boolean)).toBe(false);
  });
});

describe("the facts a meter may encode", () => {
  it("maps a rating out of five onto ten bars", () => {
    expect(ratingFill(4.8)).toBe(10);
    expect(ratingFill(4.2)).toBe(8);
    expect(ratingFill(3.2)).toBe(6);
    expect(ratingFill(null)).toBe(0);
  });

  it("gives one bar per counted item, capped at ten", () => {
    expect(countFill(3)).toBe(3);
    expect(countFill(9)).toBe(9);
    expect(countFill(42)).toBe(10);
    expect(countFill(0)).toBe(0);
  });

  it("never draws a confidence band as certain", () => {
    expect(CONFIDENCE_FILL.high).toBeLessThan(METER_SEGMENTS);
    expect(CONFIDENCE_FILL.low).toBeLessThan(CONFIDENCE_FILL.medium);
    expect(CONFIDENCE_FILL.medium).toBeLessThan(CONFIDENCE_FILL.high);
    expect(meterLevel(CONFIDENCE_FILL.low)).toBe("low");
    expect(meterLevel(CONFIDENCE_FILL.medium)).toBe("mid");
    expect(meterLevel(CONFIDENCE_FILL.high)).toBe("high");
  });
});
