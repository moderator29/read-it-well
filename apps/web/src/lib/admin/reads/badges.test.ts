import { describe, expect, it, vi } from "vitest";

const rows = [
  { user_id: "u1", tier: "platinum" },
  { user_id: "u2", tier: "gold" },
  { user_id: "u3", tier: "none" },
  { user_id: "u4", tier: null },
];
let fail = false;
vi.mock("../guard", () => ({
  requireAdmin: async () => ({
    state: "admin",
    supabase: {
      from: () => ({
        select: () => ({
          in: async (_c: string, ids: string[]) =>
            fail ? { data: null, error: new Error("x") } : { data: rows.filter((r) => ids.includes(r.user_id)), error: null },
        }),
      }),
    },
  }),
}));

const { getBadgeTiers, tiersFromRows } = await import("./badges");

describe("badge tiers, read from person_badge and never derived", () => {
  it("keeps only the tiers the view states", () => {
    expect(tiersFromRows(rows)).toEqual({ u1: "platinum", u2: "gold" });
  });
  it("asks only for the people drawn, once each", async () => {
    expect(await getBadgeTiers(["u1", "u1", "u3", null, undefined, ""])).toEqual({ u1: "platinum" });
  });
  it("draws no badge rather than a wrong one when the read fails", async () => {
    fail = true;
    expect(await getBadgeTiers(["u1"])).toEqual({});
    fail = false;
  });
});
