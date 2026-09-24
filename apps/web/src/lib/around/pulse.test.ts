import { describe, expect, it } from "vitest";
import { isFloodSeason, isPulseAnswer, kindLine, nextQuestion, readPulseResult, summarise } from "./pulse";

const rows = [
  { area_name: "Yaba", kind: "light", answer: "most", reports: 11, members: 9, window_days: 30 },
  { area_name: "Yaba", kind: "light", answer: "some", reports: 3, members: 9, window_days: 30 },
  { area_name: "Yaba", kind: "flood", answer: "road", reports: 6, members: 6, window_days: 365 },
  { area_name: "Yaba", kind: "weather", answer: "sunny", reports: 99, members: 99, window_days: 1 },
];

const copy = {
  answers: {
    light: { most: "Most of the day", some: "Some of the day", none: "None" },
    water: { normal: "Running as normal", tanker: "Tanker", none: "None" },
    flood: { none: "No flooding", road: "The road cuts off", compound: "Water enters the compound" },
  },
  line: "{answer} on {n} of {total} reports in the last {days} days",
};

describe("the neighbours' account (V-41)", () => {
  it("sums each kind, most reported first, and drops unknown kinds", () => {
    const summary = summarise(rows);
    expect(summary.areaName).toBe("Yaba");
    expect(summary.kinds.map((k) => k.kind)).toEqual(["light", "flood"]);
    expect(summary.kinds[0]).toMatchObject({ total: 14, members: 9, windowDays: 30 });
  });

  it("says counts, never a grade", () => {
    const light = summarise(rows).kinds[0]!;
    expect(kindLine(light, copy)).toBe("Most of the day on 11 of 14 reports in the last 30 days");
  });

  it("asks one question at a time, flooding only in June and September", () => {
    const all = { eligible: true, lister: false, light: true, water: true, flood: true };
    const july = new Date("2026-07-10T09:00:00Z");
    const june = new Date("2026-06-10T09:00:00Z");
    expect(nextQuestion(all, july)).toEqual({ kind: "light" });
    expect(nextQuestion({ ...all, light: false }, july)).toEqual({ kind: "water" });
    expect(nextQuestion({ ...all, light: false, water: false }, july)).toEqual({ none: "done" });
    expect(nextQuestion({ ...all, light: false, water: false }, june)).toEqual({ kind: "flood" });
    expect(nextQuestion({ ...all, eligible: false }, june)).toEqual({ none: "too-new" });
    expect(nextQuestion({ ...all, lister: true }, june)).toEqual({ none: "lister" });
    expect(isFloodSeason(new Date("2026-09-30T23:30:00Z"))).toBe(false); // 00:30 on 1 October in Lagos
  });

  it("reads the database's word, and anything else as a failure", () => {
    expect(readPulseResult("too-new")).toBe("too-new");
    expect(readPulseResult("hello")).toBe("failed");
    expect(isPulseAnswer("flood", "road")).toBe(true);
    expect(isPulseAnswer("flood", "most")).toBe(false);
  });
});
