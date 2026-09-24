import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { COUNTED_REVIEWS, isMissingRelation, readCountedReviews } from "./weight";

describe("public review lists read the counted view (V-58)", () => {
  it("reads the view and never the table when the view answers", async () => {
    const asked: string[] = [];
    const out = await readCountedReviews(async (table) => {
      asked.push(table);
      return { data: [{ id: "a" }], error: null };
    });
    expect(asked).toEqual([COUNTED_REVIEWS]);
    expect(out.data).toEqual([{ id: "a" }]);
  });

  it("falls back to the table only when the view does not exist yet", async () => {
    const asked: string[] = [];
    await readCountedReviews(async (table) => {
      asked.push(table);
      return table === COUNTED_REVIEWS ? { data: null, error: { code: "PGRST205" } } : { data: [], error: null };
    });
    expect(asked).toEqual([COUNTED_REVIEWS, "reviews"]);
  });

  it("returns any other error as it is, so a failure never widens what a reader sees", async () => {
    const asked: string[] = [];
    const out = await readCountedReviews(async (table) => {
      asked.push(table);
      return { data: null, error: { code: "42501" } };
    });
    expect(asked).toEqual([COUNTED_REVIEWS]);
    expect(out.error).toEqual({ code: "42501" });
    expect(isMissingRelation({ code: "42P01" })).toBe(true);
    expect(isMissingRelation(null)).toBe(false);
  });

  it("is what the listing's reviews, the landing quotes and the average read, and nothing reads the register", () => {
    const root = join(__dirname, "..", "..");
    const queries = readFileSync(join(root, "lib/reviews/queries.ts"), "utf8");
    expect(queries.match(/readCountedReviews<ReviewRow>/g)?.length).toBe(2);
    const repo = readFileSync(join(root, "lib/listings/supabase-repository.ts"), "utf8");
    expect(repo).toContain("readCountedReviews<");
    expect(queries + repo).not.toContain('"weight_withheld"');
  });
});
