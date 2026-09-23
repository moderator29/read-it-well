import { describe, expect, it } from "vitest";
import type { Inspection, InspectionState } from "@/lib/inspections/types";
import { groupInspections, tagSide, yourMoveCount } from "./grouping";

function row(
  id: string,
  state: InspectionState,
  extra: Partial<Inspection> = {},
): Inspection {
  return {
    id,
    listingId: `listing-${id}`,
    listingTitle: `Flat ${id}`,
    state,
    requestedAt: "2026-09-20T10:00:00.000Z",
    slotAt: null,
    note: null,
    listerNote: null,
    createdAt: "2026-09-18T10:00:00.000Z",
    respondedAt: null,
    conversationId: null,
    counterpartName: null,
    ...extra,
  };
}

describe("grouping a person's inspections", () => {
  it("puts REQUESTED, PROPOSED and CONFIRMED in open and the rest in closed", () => {
    const groups = groupInspections([
      ...tagSide([row("a", "REQUESTED"), row("b", "COMPLETED"), row("c", "DECLINED")], "requester"),
      ...tagSide([row("d", "PROPOSED"), row("e", "CONFIRMED"), row("f", "WITHDRAWN")], "lister"),
    ]);
    expect(groups.open.map((r) => r.id).sort()).toEqual(["a", "d", "e"]);
    expect(groups.closed.map((r) => r.id).sort()).toEqual(["b", "c", "f"]);
  });

  it("orders open rows: your move, then booked in soonest first, then waiting on them", () => {
    const groups = groupInspections([
      /* Waiting on the lister, read as requester: their move. */
      ...tagSide([row("theirs", "REQUESTED", { createdAt: "2026-09-18T12:00:00.000Z" })], "requester"),
      /* Offered a time, read as requester: my move. */
      ...tagSide([row("mine", "PROPOSED", { createdAt: "2026-09-18T09:00:00.000Z" })], "requester"),
      /* Two confirmed inspections, the later one listed first on purpose. */
      ...tagSide(
        [
          row("later", "CONFIRMED", { slotAt: "2026-09-25T10:00:00.000Z" }),
          row("sooner", "CONFIRMED", { slotAt: "2026-09-21T10:00:00.000Z" }),
        ],
        "lister",
      ),
      /* Asked of me as lister: my move, and newer than "mine". */
      ...tagSide([row("asked", "REQUESTED", { createdAt: "2026-09-18T11:00:00.000Z" })], "lister"),
    ]);
    expect(groups.open.map((r) => r.id)).toEqual(["asked", "mine", "sooner", "later", "theirs"]);
    expect(yourMoveCount(groups)).toBe(2);
  });

  it("orders closed rows by when they were settled, most recent first", () => {
    const groups = groupInspections(
      tagSide(
        [
          row("old", "COMPLETED", { respondedAt: "2026-09-01T10:00:00.000Z" }),
          row("new", "DECLINED", { respondedAt: "2026-09-10T10:00:00.000Z" }),
          row("unanswered", "WITHDRAWN", { createdAt: "2026-09-05T10:00:00.000Z" }),
        ],
        "requester",
      ),
    );
    expect(groups.closed.map((r) => r.id)).toEqual(["new", "unanswered", "old"]);
  });

  it("never lists the same request twice", () => {
    const groups = groupInspections([
      ...tagSide([row("dup", "REQUESTED")], "requester"),
      ...tagSide([row("dup", "REQUESTED")], "lister"),
    ]);
    expect(groups.open).toHaveLength(1);
  });
});
