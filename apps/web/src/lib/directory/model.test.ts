import { describe, expect, it } from "vitest";
import { emptyDirectoryTitle, entryHref, factLine, filterEntries, parseEntries } from "./model";

const raw = (over: Record<string, unknown>) => ({
  kind: "agent",
  display_name: "Ada Homes",
  ref: "ada",
  avatar_url: null,
  place_code: "LA",
  place_name: "Lagos",
  area: "Lekki",
  verified: true,
  verification_tier: 1,
  completed: 2,
  live_listings: 1,
  since: "2026-10-01",
  ...over,
});

describe("one directory, flipped by the side", () => {
  it("draws only the kinds of the side it is on", () => {
    const data = [raw({}), raw({ kind: "hotel", display_name: "Eko Hotel" }), raw({ kind: "firm", display_name: "Lekki Realty" })];
    expect(parseEntries(data, "property").map((e) => e.name)).toEqual(["Ada Homes", "Lekki Realty"]);
    expect(parseEntries(data, "stays").map((e) => e.name)).toEqual(["Eko Hotel"]);
  });

  it("drops a row without a name or a known kind", () => {
    expect(parseEntries([raw({ display_name: " " }), raw({ kind: "wizard" })], "property")).toEqual([]);
    expect(parseEntries("nope", "property")).toEqual([]);
  });

  it("filters by kind and by name, area or state as you type", () => {
    const entries = parseEntries(
      [raw({}), raw({ kind: "landlord", display_name: "Tunde B.", area: "Yaba", ref: "t" }), raw({ kind: "firm", display_name: "Lekki Realty", ref: null })],
      "property",
    );
    expect(filterEntries(entries, "landlord", "").map((e) => e.name)).toEqual(["Tunde B."]);
    expect(filterEntries(entries, "all", "yaba").map((e) => e.name)).toEqual(["Tunde B."]);
    expect(filterEntries(entries, "all", "lekki").map((e) => e.name)).toEqual(["Ada Homes", "Lekki Realty"]);
    expect(filterEntries(entries, "all", "lagos")).toHaveLength(3);
  });

  it("says only real counts, and New on Vallo when there are none", () => {
    expect(factLine({ kind: "agent", completed: 2, liveListings: 1 })).toBe("2 deals on Vallo · 1 listing live");
    expect(factLine({ kind: "hotel", completed: 1, liveListings: 3 })).toBe("1 stay on Vallo · 3 places live");
    expect(factLine({ kind: "agent", completed: 0, liveListings: 0 })).toBe("New on Vallo");
  });

  it("links people to their profile and stays to their page", () => {
    expect(entryHref({ kind: "agent", ref: "ada" })).toBe("/u/ada");
    expect(entryHref({ kind: "shortlet", ref: "acc1" })).toBe("/stay/acc1");
    expect(entryHref({ kind: "firm", ref: null })).toBeNull();
  });

  it("titles the empty directory for the side, the filter and the place", () => {
    expect(emptyDirectoryTitle("property", "all", "city", "Lagos")).toBe("No agents in Lagos yet");
    expect(emptyDirectoryTitle("stays", "hotel", "global", "Lagos")).toBe("No hotels on Vallo yet");
  });
});
