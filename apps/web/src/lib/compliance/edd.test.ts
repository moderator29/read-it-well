import { describe, expect, it } from "vitest";
import { eddStage, readEddReviews } from "./edd";

/** SCUML items 20 and 15: the review model the lanes draw. */
const row = {
  id: "r1",
  user_id: "u1",
  name: "Ada Obi",
  item: 20,
  reason: "transaction",
  source_table: "wallet_entries",
  source_id: "w1",
  amount_minor: 125000000,
  raised_at: "2026-09-24T10:00:00Z",
  decision: null,
};

describe("readEddReviews", () => {
  it("reads a review and skips anything malformed", () => {
    const out = readEddReviews([row, { id: "x" }, null, { ...row, id: "r2", reason: "bogus" }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "r1", item: 20, amountMinor: 125000000, decision: null });
  });

  it("returns nothing for a read that is not a list", () => {
    expect(readEddReviews(null)).toEqual([]);
  });
});

describe("eddStage", () => {
  const decided = readEddReviews([
    {
      ...row,
      decision: {
        id: "d1",
        source_of_funds: "Salary",
        outcome: "cleared",
        decided_by: "staffA",
        decided_by_name: "Staff A",
        decided_at: "2026-09-24T11:00:00Z",
        approved_by_name: null,
        approved_at: null,
      },
    },
  ])[0]!;

  it("never offers the decider their own approval", () => {
    expect(eddStage(decided, "staffA")).toBe("own_decision");
    expect(eddStage(decided, "staffB")).toBe("awaiting_second");
  });

  it("knows undecided and approved", () => {
    expect(eddStage(readEddReviews([row])[0]!, "staffA")).toBe("undecided");
    const approved = { ...decided, decision: { ...decided.decision!, approvedAt: "2026-09-24T12:00:00Z" } };
    expect(eddStage(approved, "staffB")).toBe("approved");
  });
});
