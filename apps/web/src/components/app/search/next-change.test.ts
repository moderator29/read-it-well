import { describe, expect, it } from "vitest";
import { nextChange, relaxations } from "./next-change";
import { parseShelfQuery } from "./shelf-query";

describe("what to change next when a search finds nothing", () => {
  it("offers one change per active group, each dropping only that group", () => {
    const query = parseShelfQuery({ beds: "3", max: "2000000", verified: "1", area: "yaba", q: "flat" });
    const options = relaxations(query);
    expect(options.map((o) => o.key)).toEqual(["price", "beds", "verified", "area"]);
    const beds = options.find((o) => o.key === "beds")!.query;
    expect(beds.bedrooms).toBeUndefined();
    expect(beds.maxMinor).toBe(query.maxMinor);
    expect(beds.verifiedOnly).toBe(true);
    expect(beds.q).toBe("flat");
    expect(beds.areas).toEqual(["yaba"]);
    /* The original query is never touched. */
    expect(query.bedrooms).toBe(3);
  });

  it("picks the change that brings the most places back, ties to the chip order", () => {
    const query = parseShelfQuery({ beds: "3", max: "2000000", verified: "1" });
    const counts = { price: 4, beds: 9, verified: 9 } as Record<string, number>;
    const pick = nextChange(query, (relaxed) => {
      if (relaxed.maxMinor === undefined) return counts.price!;
      if (relaxed.bedrooms === undefined) return counts.beds!;
      return relaxed.verifiedOnly ? 0 : counts.verified!;
    });
    expect(pick?.key).toBe("beds");
  });

  it("offers nothing when no single change brings anything back", () => {
    const query = parseShelfQuery({ beds: "3", max: "2000000" });
    expect(nextChange(query, () => 0)).toBeNull();
    expect(nextChange(parseShelfQuery({}), () => 5)).toBeNull();
  });
});
