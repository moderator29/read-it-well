import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { withheldReviewIds, withoutWithheld } from "./weight";

function reader(result: { data: unknown; error: unknown } | "throw") {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: async () => {
            if (result === "throw") throw new Error("down");
            return result;
          },
        }),
      }),
    }),
  };
}

describe("reviews that carry no weight (V-58)", () => {
  it("reads the withheld ids and leaves those reviews out, in order", async () => {
    const ids = await withheldReviewIds(reader({ data: [{ subject_id: "b" }], error: null }), ["a", "b", "c"]);
    expect([...ids]).toEqual(["b"]);
    expect(withoutWithheld([{ id: "a" }, { id: "b" }, { id: "c" }], ids).map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("excludes nothing when the register cannot be read", async () => {
    expect((await withheldReviewIds(reader({ data: null, error: { code: "42P01" } }), ["a"])).size).toBe(0);
    expect((await withheldReviewIds(reader("throw"), ["a"])).size).toBe(0);
    expect((await withheldReviewIds(reader({ data: [], error: null }), [])).size).toBe(0);
  });

  it("is applied to the listing's reviews, the landing quotes and the average", () => {
    const root = join(__dirname, "..", "..");
    const queries = readFileSync(join(root, "lib/reviews/queries.ts"), "utf8");
    expect(queries.match(/withoutWithheld\(rows, await withheldReviewIds/g)?.length).toBe(2);
    const repo = readFileSync(join(root, "lib/listings/supabase-repository.ts"), "utf8");
    expect(repo).toContain("withoutWithheld(rows, await withheldReviewIds(supabase");
  });
});
