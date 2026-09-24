import { describe, expect, it } from "vitest";
import { inferShape, matchesUnit, readUnit, shapeFromSlug, shapeSlug, unitLine, unitPayload } from "./unit-shape";
import { submitRequirements } from "@/lib/agent/listings-schema";

const COPY = {
  shapes: {
    self_contain: "Self-contain",
    room_parlour: "Room and parlour",
    mini_flat: "Mini flat",
    flat: "Flat",
    duplex: "Duplex",
    terrace: "Terrace",
    semi_detached: "Semi-detached",
    detached: "Detached house",
    bungalow: "Bungalow",
    maisonette: "Maisonette",
    penthouse: "Penthouse",
    boys_quarters: "Boys' quarters",
  },
  bed: "{n} bed",
  allEnsuite: "all en-suite",
  bothEnsuite: "both en-suite",
  someEnsuite: "{n} en-suite",
  withBq: "with BQ",
};

describe("unit shapes", () => {
  it("reads a row, dropping what it does not know", () => {
    expect(readUnit({ unit_shape: "mini_flat", ensuite_count: 1, has_bq: false })).toEqual({
      shape: "mini_flat",
      ensuiteCount: 1,
      hasBq: false,
    });
    expect(readUnit({ unit_shape: "castle" })).toBeNull();
    expect(readUnit({})).toBeNull();
  });

  it("writes the card line the market reads", () => {
    expect(unitLine(2, { shape: "flat", ensuiteCount: 2, hasBq: true }, COPY)).toBe("2 bed flat, both en-suite, with BQ");
    expect(unitLine(4, { shape: "duplex", ensuiteCount: 4 }, COPY)).toBe("4 bed duplex, all en-suite");
    expect(unitLine(3, { shape: "bungalow", ensuiteCount: 1 }, COPY)).toBe("3 bed bungalow, 1 en-suite");
    expect(unitLine(1, { shape: "self_contain" }, COPY)).toBe("Self-contain");
    expect(unitLine(1, { shape: "mini_flat", ensuiteCount: 1 }, COPY)).toBe("Mini flat");
    expect(unitLine(2, { hasBq: true }, COPY)).toBeNull();
  });

  it("filters strictly: an unshaped listing matches no shape", () => {
    expect(matchesUnit(undefined, { shapes: ["flat"] })).toBe(false);
    expect(matchesUnit({ shape: "flat" }, { shapes: ["flat", "duplex"] })).toBe(true);
    expect(matchesUnit({ shape: "flat" }, { withBq: true })).toBe(false);
    expect(matchesUnit(undefined, {})).toBe(true);
  });

  it("suggests only where the bedrooms decide it", () => {
    expect(inferShape(0)).toBe("self_contain");
    expect(inferShape(1)).toBe("mini_flat");
    expect(inferShape(2)).toBeNull();
  });

  it("caps en-suite rooms at the bedrooms and keeps unanswered unanswered", () => {
    expect(unitPayload({ shape: "flat", ensuite: "5", bq: "yes" }, 3)).toEqual({ unitShape: "flat", ensuiteCount: 3, hasBq: true });
    expect(unitPayload({ shape: "", ensuite: "", bq: "" }, 3)).toEqual({ unitShape: null, ensuiteCount: null, hasBq: null });
  });

  it("spells shapes for the address bar and back", () => {
    expect(shapeSlug("semi_detached")).toBe("semi-detached");
    expect(shapeFromSlug("Mini-Flat")).toBe("mini_flat");
    expect(shapeFromSlug("hut")).toBeNull();
  });
});

describe("the submit gate asks a home for its shape", () => {
  const base = {
    title: "x", description: "x", propertyType: "apartment" as const, stateCode: "LA", city: "Lagos", area: "Yaba",
    intent: "rent" as const, rentMinor: 1, rentPeriod: "year" as const, rateMinor: null, ratePeriod: null,
    salePriceMinor: null, tenure: null, bedrooms: 1, bathrooms: 1, amenityCount: 1, photoCount: 5, hasCover: true,
  };
  const fields = (s: Parameters<typeof submitRequirements>[0]) => submitRequirements(s).map((r) => r.field);
  it("requires it when it could be read and is missing", () => {
    expect(fields({ ...base, unitShape: null })).toContain("unitShape");
    expect(fields({ ...base, unitShape: "mini_flat" })).not.toContain("unitShape");
  });
  it("does not ask when the column could not be read, or of a shop", () => {
    expect(fields(base)).not.toContain("unitShape");
    expect(fields({ ...base, propertyType: "shop", unitShape: null })).not.toContain("unitShape");
  });
});

describe("the shelf reads the words", () => {
  it("turns WhatsApp shorthand into the query and keeps the rest as text", async () => {
    const { parseShelfQuery, applyWords, toShelfHref } = await import("@/components/app/search/shelf-query");
    const { parseWords } = await import("./query-parse");
    const query = parseShelfQuery({ q: "2br mini flat under 2m yaba/akoka no agency fee" });
    const next = applyWords(query, parseWords(query.q!));
    expect(next.q).toBeUndefined();
    expect(next.bedrooms).toBe(2);
    expect(next.shapes).toEqual(["mini_flat"]);
    expect(next.areas).toEqual(["yaba", "akoka"]);
    expect(next.listerRoles).toEqual(["owner"]);
    const href = toShelfHref(next);
    expect(href).toContain("shape=mini-flat");
    expect(href).toContain("area=yaba%2Cakoka");
    const back = parseShelfQuery(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
    expect(back.shapes).toEqual(["mini_flat"]);
    expect(back.areas).toEqual(["yaba", "akoka"]);
  });
});
