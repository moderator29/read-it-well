import { describe, expect, it } from "vitest";
import { MIN_BAR, VOICE_BARS, formatDuration, peaksFrom } from "./voice";

describe("peaksFrom", () => {
  it("scales the loudest bar of the recording to full height", () => {
    const samples = [0, 0.1, 0.2, 0.4, 0.2, 0.1, 0, 0.05];
    const bars = peaksFrom(samples, 4);
    expect(bars).toHaveLength(4);
    expect(Math.max(...bars)).toBe(1);
    expect(bars[1]).toBe(1);
  });
  it("reads a negative swing as loud as a positive one", () => {
    expect(peaksFrom([-0.8, 0.2], 2)).toEqual([1, 0.25]);
  });
  it("keeps a silent recording flat instead of dividing zero by zero", () => {
    expect(peaksFrom(new Float32Array(100), 5)).toEqual([MIN_BAR, MIN_BAR, MIN_BAR, MIN_BAR, MIN_BAR]);
  });
  it("gives a quiet bar a visible minimum", () => {
    const bars = peaksFrom([1, 0.001], 2);
    expect(bars[1]).toBe(MIN_BAR);
  });
  it("is empty for no samples, and defaults to the shared bar count", () => {
    expect(peaksFrom([], 10)).toEqual([]);
    expect(peaksFrom(new Float32Array(4000).fill(0.5))).toHaveLength(VOICE_BARS);
  });
});

describe("formatDuration", () => {
  it("writes minutes and padded seconds", () => {
    expect(formatDuration(7_000)).toBe("0:07");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(750_000)).toBe("12:30");
  });
  it("says nothing when the length is not known", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(Number.NaN)).toBeNull();
    expect(formatDuration(-1)).toBeNull();
  });
});
