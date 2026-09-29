import "server-only";

import {
  HOLD_SWEEP_LIMIT,
  HOLD_TTL_HOURS,
  holdSweepVerdict,
  parseHoldSweepResult,
  type JobVerdict,
} from "../../bookings/lifecycle";
import { callServiceFunction, type AdminClient } from "../rpc";
import { sweepStaleAttempts, withAttemptSweep } from "../../payments/attempt-sweep";

/**
 * The hold TTL sweep. A PENDING request nobody confirmed within the hold
 * window is CANCELLED, its calendar nights go back, its state event is
 * written and the notify trigger tells the guest and the host, all inside
 * public.expire_booking_holds (one transaction per run). A PENDING booking
 * that has been paid is never touched and comes back as an alert.
 *
 * pg_cron runs the same function every fifteen minutes as
 * vallo_release_stale_holds; this is its watched twin, so a database job
 * that quietly stops is noticed by the next scheduled request. Both are
 * idempotent: a hold is released once because the update is guarded on
 * PENDING, and a second run finds nothing.
 */
export async function holdSweep(admin: AdminClient): Promise<JobVerdict> {
  /* The holds first, so a slow Paystack can never keep them from being
     released: the database's own in-flight rule (45 minutes since the
     checkout was last opened) already judges them without the sweep. */
  const data = await callServiceFunction(admin, "expire_booking_holds", {
    p_ttl: `${HOLD_TTL_HOURS} hours`,
    p_limit: HOLD_SWEEP_LIMIT,
  });
  const verdict = holdSweepVerdict(parseHoldSweepResult(data));
  /* Then close card attempts Paystack says were abandoned, failed or paid
     (lib/payments/attempt-sweep.ts), inside its own 40-second budget. It never
     throws, so the hold verdict above is always reported. */
  const attempts = await sweepStaleAttempts(admin);
  return withAttemptSweep(verdict, attempts);
}
