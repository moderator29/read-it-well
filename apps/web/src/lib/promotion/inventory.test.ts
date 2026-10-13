import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PROMOTED_LABEL, separatePromoted } from "./inventory";

describe("promotion is separate inventory", () => {
  it("never re-orders organic results and never duplicates a listing", () => {
    const organic = [{ id: "b" }, { id: "a" }, { id: "c" }];
    const out = separatePromoted(organic, [
      { placementId: "p1", listingId: "a", tier: "boost", label: PROMOTED_LABEL },
      { placementId: "p2", listingId: "z", tier: "prime", label: PROMOTED_LABEL },
    ]);
    expect(out.organic.map((o) => o.id)).toEqual(["b", "a", "c"]);
    expect(out.promoted.map((p) => p.listingId)).toEqual(["z"]);
  });

  it("the organic ranking does not import or name promotion", () => {
    const source = readFileSync(join(__dirname, "..", "listings", "ranking.ts"), "utf8");
    expect(source).not.toMatch(/promotion|placement|PROMOTED/i);
  });
});
