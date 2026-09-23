import { isOpen, waitingOn, type Inspection, type InspectionState } from "@/lib/inspections/types";

/**
 * THE CONSUMER INSPECTIONS PAGE, AS TWO GROUPS.
 *
 * A person can be both sides of this table: they rent a flat in Yaba and let
 * the one they inherited in Surulere. `/inspections` therefore reads the rows
 * they asked for AND the rows they were asked to show, and each one carries
 * which end of it the reader is on, because that decides what they can do to
 * it and whose move it is.
 *
 * Two groups and only two, which is the founder's ask and the agent console's
 * layout: OPEN is anything still live (asked, offered another time, or booked
 * in), CLOSED is a record (it happened, it was declined, it was withdrawn).
 * `OPEN_STATES` in the types module deliberately excludes CONFIRMED because
 * there "open" means "somebody owes an answer"; here it means "still ahead of
 * you", which is the reading a person scanning their own diary wants.
 *
 * Inside OPEN the order is the order of attention: rows where it is the
 * reader's move first, then the inspections that are booked in, soonest first,
 * then the ones waiting on the other side. Inside CLOSED, most recent first.
 */

export type Side = "lister" | "requester";

export type SidedInspection = Inspection & { side: Side };

export type InspectionGroups = {
  open: SidedInspection[];
  closed: SidedInspection[];
};

const LIVE: readonly InspectionState[] = ["REQUESTED", "PROPOSED", "CONFIRMED"];

export function isLive(state: InspectionState): boolean {
  return LIVE.includes(state);
}

/** Tag each row with the side it was read from. */
export function tagSide(rows: Inspection[], side: Side): SidedInspection[] {
  return rows.map((row) => ({ ...row, side }));
}

/** 0 = your move, 1 = booked in, 2 = waiting on them. */
function attentionRank(row: SidedInspection): number {
  if (row.state === "CONFIRMED") return 1;
  return waitingOn(row.state) === row.side ? 0 : 2;
}

function closedAt(row: SidedInspection): string {
  return row.respondedAt ?? row.createdAt;
}

export function groupInspections(rows: SidedInspection[]): InspectionGroups {
  /* One row per id. The two reads cannot legitimately return the same row,
     because a person is never both parties to one request, but a page that
     merges two lists dedupes them anyway rather than trusting that. */
  const seen = new Set<string>();
  const unique = rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  const open = unique
    .filter((row) => isLive(row.state))
    .sort((a, b) => {
      const rank = attentionRank(a) - attentionRank(b);
      if (rank !== 0) return rank;
      if (a.state === "CONFIRMED" && b.state === "CONFIRMED") {
        const aAt = a.slotAt ?? a.requestedAt;
        const bAt = b.slotAt ?? b.requestedAt;
        return aAt.localeCompare(bAt);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  const closed = unique
    .filter((row) => !isLive(row.state))
    .sort((a, b) => closedAt(b).localeCompare(closedAt(a)));

  return { open, closed };
}

/** How many rows in OPEN are the reader's move. The count the nav row could carry. */
export function yourMoveCount(groups: InspectionGroups): number {
  return groups.open.filter((row) => attentionRank(row) === 0).length;
}

/* `isOpen` is re-exported so callers that want the types module's stricter
   reading ("somebody owes an answer") reach it through the same door. */
export { isOpen };
