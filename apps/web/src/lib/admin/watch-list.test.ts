import { describe, expect, it } from "vitest";
import { parseWatchList, signalWords } from "./watch-list";

describe("the agreement watch list (D68d)", () => {
  it("reads the database's rows in its order, with the signals in words", () => {
    const rows = parseWatchList({
      status: "ok",
      rows: [
        { agreement_id: "a1", kind: "rent", agreement_status: "in_review", amount_minor: 100, rail: "direct", reasons: ["first_deal", "amount_over"], risk_score: 2, needs_decision: true, since: "t" },
        { agreement_id: "a2", kind: "rent", agreement_status: "approved", amount_minor: 200, rail: "escrow", reasons: [], risk_score: 0, needs_decision: false, since: "t", arrangement_id: "x", held_status: "protected", release_paused_at: "2026-10-07T10:00:00Z" },
      ],
    });
    expect(rows?.map((r) => r.agreementId)).toEqual(["a1", "a2"]);
    expect(rows?.[1]).toMatchObject({ rail: "escrow", heldStatus: "protected", releasePaused: true });
    expect(signalWords("payout_name")).toMatch(/does not match/);
    expect(signalWords("something_new")).toBe("something_new");
  });

  it("a refusal or an unreadable answer is null, never an empty list that looks safe", () => {
    expect(parseWatchList({ status: "forbidden" })).toBeNull();
    expect(parseWatchList(null)).toBeNull();
  });
});
