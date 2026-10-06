import { describe, expect, it } from "vitest";
import { buildPath, passedCount } from "./verification-path";
import { VERIFICATION_LADDER } from "@/lib/trust/verification";

describe("the verification path", () => {
  it("with no ladder and nothing filed is four upcoming rungs, each naming its own evidence", () => {
    const path = buildPath({ ladder: null, documents: null });
    expect(path.map((r) => r.state)).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(path.map((r) => r.evidence)).toEqual([
      VERIFICATION_LADDER.identity.evidence,
      VERIFICATION_LADDER.address.evidence,
      VERIFICATION_LADDER.payout.evidence,
      VERIFICATION_LADDER.in_person.evidence,
    ]);
    expect(passedCount(path)).toBe(0);
  });

  it("marks only decided rungs passed, with their date, and the next undecided rung current", () => {
    const path = buildPath({
      ladder: { rungs: { identity: { status: "passed", note: null, decidedAt: "2026-03-01T09:00:00Z" } } },
      documents: null,
    });
    expect(path.map((r) => r.state)).toEqual(["passed", "current", "upcoming", "upcoming"]);
    expect(path[0]!.decidedAt).toBe("2026-03-01T09:00:00Z");
    expect(path[1]!.decidedAt).toBeNull();
    expect(passedCount(path)).toBe(1);
  });

  it("stops at a refused rung, carries the reviewer's words, and leaves the rest upcoming", () => {
    const path = buildPath({
      ladder: {
        rungs: {
          identity: { status: "passed", note: null, decidedAt: "2026-03-01T09:00:00Z" },
          address: { status: "failed", note: "The bill is older than three months.", decidedAt: "2026-03-02T09:00:00Z" },
        },
      },
      documents: null,
    });
    expect(path.map((r) => r.state)).toEqual(["passed", "failed", "upcoming", "upcoming"]);
    expect(path[1]!.note).toBe("The bill is older than three months.");
  });

  it("follows the documents' own review for someone with no ladder, on the two rungs they filed", () => {
    const pending = buildPath({ ladder: null, documents: { state: "pending" } });
    expect(pending.map((r) => r.state)).toEqual(["current", "current", "upcoming", "upcoming"]);
    expect(pending[0]!.word).toBe("inReview");
    const rejected = buildPath({ ladder: null, documents: { state: "rejected" } });
    expect(rejected[0]!.word).toBe("documentsRejected");
    const approved = buildPath({ ladder: null, documents: { state: "approved" } });
    expect(approved.map((r) => r.state)).toEqual(["passed", "passed", "upcoming", "upcoming"]);
    expect(approved[0]!.decidedAt).toBeNull();
  });
});
