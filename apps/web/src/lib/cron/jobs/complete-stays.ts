import "server-only";

import {
  COMPLETION_SWEEP_LIMIT,
  completionSweepVerdict,
  parseCompletionSweepResult,
  type JobVerdict,
} from "../../bookings/lifecycle";
import { callServiceFunction, type AdminClient } from "../rpc";

/**
 * COMPLETED at check-out. A paid CONFIRMED stay whose check-out day has
 * passed (Lagos, strictly, so the host keeps the check-out day to record a
 * no show by hand) becomes COMPLETED inside public.complete_ended_stays:
 * state event, guest told by the notify trigger, host told by the function.
 * A confirmed stay nobody paid for is reported as an alert and left for a
 * person, because a sweep cannot know whether the guest came.
 */
export async function completeStays(admin: AdminClient): Promise<JobVerdict> {
  const data = await callServiceFunction(admin, "complete_ended_stays", {
    p_limit: COMPLETION_SWEEP_LIMIT,
  });
  return completionSweepVerdict(parseCompletionSweepResult(data));
}
