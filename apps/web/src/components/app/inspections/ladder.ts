import type { Inspection, InspectionState } from "@/lib/inspections/types";

/**
 * THE INSPECTION LADDER, DERIVED FROM THE RECORD.
 *
 * The reference screen (F6A8A482) draws an eight-item checklist with a
 * "0 / 8 completed" count. There is no checklist model on the platform:
 * `inspection_requests` carries a state, two times, two notes and an
 * outcome, and nothing else. Inventing eight tick boxes that nothing stores
 * would be a picture of a feature (rule 19), so the ladder is the four
 * things the record can honestly say happened, in the order they happen:
 *
 *   asked      the request exists
 *   agreed     a time was agreed (CONFIRMED, or a proposed time taken)
 *   visited    the inspection happened (COMPLETED)
 *   recorded   how it went was written down (an outcome on COMPLETED)
 *
 * A declined or withdrawn request keeps the rungs it climbed and stops.
 * The "n / 4 completed" count is the count of these, so it can never claim
 * more than the row holds. A real room-by-room checklist needs a table
 * (`inspection_checks`: inspection_id, item, passed, note, photo path) and
 * a write action; that is the seam named in the F5 report.
 *
 * Pure, so it is tested rather than trusted.
 */

export type LadderKey = "asked" | "agreed" | "visited" | "recorded";

export type LadderRung = {
  key: LadderKey;
  done: boolean;
};

const AGREED: readonly InspectionState[] = ["CONFIRMED", "COMPLETED"];

export function ladderFor(inspection: Pick<Inspection, "state" | "outcome">): LadderRung[] {
  const agreed = AGREED.includes(inspection.state);
  const visited = inspection.state === "COMPLETED";
  const recorded = visited && Boolean(inspection.outcome);
  return [
    { key: "asked", done: true },
    { key: "agreed", done: agreed },
    { key: "visited", done: visited },
    { key: "recorded", done: recorded },
  ];
}

export function ladderCount(rungs: LadderRung[]): { done: number; total: number } {
  return { done: rungs.filter((rung) => rung.done).length, total: rungs.length };
}

/** True when the report may be sent: the inspection is agreed and not yet closed. */
export function canReport(state: InspectionState): boolean {
  return state === "CONFIRMED";
}
