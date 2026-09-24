import { describe, expect, it } from "vitest";
import { commuteCount, commuteLine, originKey, readBands, withinCommute } from "./commute";

const copy = {
  line: "About {low} to {high} min in the {peak} rush to {anchor}.",
  lineVia: "About {low} to {high} min in the {peak} rush to {anchor}, via {route}.",
  am: "morning",
  pm: "evening",
  guide: "From our route guide.",
  residents: "Reported by {n} residents, last 30 days.",
};

describe("commute by the clock (V-43)", () => {
  const rows = [
    { peak: "pm", low_min: 60, high_min: 110, route_label: null, source: "guide", reports: 0 },
    { peak: "am", low_min: 51, high_min: 68, route_label: "Third Mainland Bridge", source: "residents", reports: 6 },
    { peak: "am", low_min: 90, high_min: 30, route_label: null, source: "guide", reports: 0 },
  ];

  it("drops a band with no width", () => {
    expect(readBands([{ peak: "am", low_min: 150, high_min: 150, route_label: null, source: "residents", reports: 5 }])).toEqual([]);
  });

  it("reads bands, morning first, dropping a band whose range is backwards", () => {
    const bands = readBands(rows);
    expect(bands.map((b) => b.peak)).toEqual(["am", "pm"]);
    expect(bands[0]).toMatchObject({ lowMin: 51, highMin: 68, source: "residents", reports: 6 });
  });

  it("says a range, a window and whose figure it is, never one number", () => {
    expect(commuteLine(readBands(rows), "Marina", copy)).toBe(
      "About 51 to 68 min in the morning rush to Marina, via Third Mainland Bridge. Reported by 6 residents, last 30 days.",
    );
    expect(commuteLine(readBands([rows[0]!]), "Marina", copy)).toBe(
      "About 60 to 110 min in the evening rush to Marina. From our route guide.",
    );
    expect(commuteLine([], "Marina", copy)).toBeNull();
  });

  it("filters strictly on the morning band's upper end", () => {
    expect(withinCommute(readBands(rows), 70)).toBe(true);
    expect(withinCommute(readBands(rows), 60)).toBe(false);
    expect(withinCommute(readBands([rows[0]!]), 200)).toBe(false);
  });

  it("keys an origin by state and area", () => {
    expect(originKey("LA", " Yaba ")).toBe("LA|yaba");
    expect(originKey(undefined, "Yaba")).toBeNull();
  });
});

describe("the commute address", () => {
  it("round-trips to= and within=, and drops within without an anchor", async () => {
    const { parseDiscoveryQuery, toSearchHref } = await import("./search-params");
    const q = parseDiscoveryQuery({ to: "marina", within: "45" });
    expect(q.to).toBe("marina");
    expect(q.within).toBe(45);
    expect(toSearchHref(q)).toContain("to=marina");
    expect(toSearchHref(q)).toContain("within=45");
    expect(parseDiscoveryQuery({ within: "45" }).within).toBeUndefined();
    expect(parseDiscoveryQuery({ to: "Bad Slug!" }).to).toBeUndefined();
  });
});

describe("the drawer's commute count", () => {
  it("counts the limit for the shelf's own anchor", () => {
    const c = commuteCount({ to: "marina", withinOn: true }, "marina");
    expect(c.countable).toBe(true);
    expect(c.passes(40)).toBe(true);
    expect(c.passes(60)).toBe(false);
  });
  it("does not count a newly chosen anchor, and says so", () => {
    const c = commuteCount({ to: "ikeja", withinOn: true }, "marina");
    expect(c.countable).toBe(false);
    expect(c.pending).toBe(true);
    expect(c.passes(undefined)).toBe(true);
  });
  it("drops a home with no band when the limit counts", () => {
    expect(commuteCount({ to: "marina", withinOn: true }, "marina").passes(undefined)).toBe(false);
    expect(commuteCount({ to: "marina", withinOn: false }, "marina").passes(undefined)).toBe(true);
  });
});
