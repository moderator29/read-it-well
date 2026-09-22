import type { Inspection, InspectionOutcome, InspectionState } from "@/lib/inspections/types";
import { waitingOn } from "@/lib/inspections/types";

/**
 * THE STATUS CELL, which is not the listing card's badge.
 *
 * F6A8A482 draws both on the same inspection and they disagree on purpose:
 * the card says "Scheduled" (emerald, the appointment exists) while the
 * status cell says "Pending" (cyan, the report is not in yet). The card's
 * badge is what the appointment IS; this is what is still OWED on it, read
 * from the row and from whose side the reader is on, so a lister and a
 * renter never see two different truths about one request.
 *
 * One blue family: emerald good, cyan pending, rose refused, quiet for a
 * record that simply stopped. Pure, so it is tested rather than trusted.
 */

export type BadgeTone = "good" | "pending" | "bad" | "quiet";

const OUTCOME_STATUS: Record<InspectionOutcome, string> = {
  inspected: "Inspected",
  deal_done: "Deal done",
  no_deal: "No deal",
};

const CLOSED: Partial<Record<InspectionState, { label: string; tone: BadgeTone }>> = {
  DECLINED: { label: "Declined", tone: "bad" },
  WITHDRAWN: { label: "Withdrawn", tone: "quiet" },
};

export function statusFor(
  inspection: Pick<Inspection, "state" | "outcome">,
  side: "lister" | "requester",
): { label: string; tone: BadgeTone } {
  const closed = CLOSED[inspection.state];
  if (closed) return closed;
  if (inspection.state === "COMPLETED") {
    return {
      label: inspection.outcome ? OUTCOME_STATUS[inspection.outcome] : "Completed",
      tone: "good",
    };
  }
  if (inspection.state === "CONFIRMED") return { label: "Pending", tone: "pending" };
  const waiting = waitingOn(inspection.state);
  if (waiting === side) return { label: "Your move", tone: "pending" };
  /* One word, so the status cell never has to wrap its badge. */
  return { label: "Waiting", tone: "pending" };
}
