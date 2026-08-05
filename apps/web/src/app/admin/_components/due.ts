import { dueBy, type ResponseGrade } from "@/lib/trust/standards";
import { fill, type AdminCommon } from "./copy";
/* The console had its own tone vocabulary; it now shares one with the rest of
   the platform. Same meanings, one home. */
import type { StatusTone as Tone } from "@/components/ui/StatusPill";

/**
 * The response commitment a queue row is under, as a chip.
 *
 * /standards publishes three numbers: four hours for anything about being asked
 * to pay outside RentMe or about somebody being unsafe, one day for the rest of
 * the safety work, three days for judgement calls. Those numbers are only worth
 * something if the shift working the queue is shown the same clock, so both
 * sides import `RESPONSE_COMMITMENTS` from `lib/trust/standards.ts` and neither
 * can be changed without changing the other.
 *
 * Whole hours, deliberately. A console chip counting minutes reads as a
 * countdown to panic rather than as a workload, and the promise is in hours.
 */
export function dueChip(
  openedAt: string,
  grade: ResponseGrade,
  common: AdminCommon,
): { label: string; tone: Tone } {
  const due = dueBy(openedAt, grade);
  if (due.overdue) {
    return {
      label: fill(common.overdue, { hours: Math.abs(due.hoursLeft) }),
      tone: "danger",
    };
  }
  if (due.hoursLeft < 1) return { label: common.dueSoon, tone: "warning" };
  return { label: fill(common.dueIn, { hours: due.hoursLeft }), tone: "warning" };
}
