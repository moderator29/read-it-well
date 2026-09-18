import "server-only";

import {
  CRON_WATCH_LIMIT,
  CRON_WATCH_WINDOW,
  cronWatchVerdict,
  parseCronFailures,
  type JobVerdict,
} from "../../bookings/lifecycle";
import { callServiceFunction, type AdminClient } from "../rpc";

/**
 * The watch on the database's own scheduler. Six pg_cron jobs run inside
 * Postgres and, until now, nothing read cron.job_run_details (A2-121). This
 * job asks public.cron_job_failures for every failed run in the window and
 * raises one alert naming the job, the run and the first line of the error.
 * Where the run table is not readable it says so in the envelope and raises
 * nothing, so the deploy notes own that gap rather than a false alarm.
 */
export async function pgCronWatch(admin: AdminClient): Promise<JobVerdict> {
  const data = await callServiceFunction(admin, "cron_job_failures", {
    p_since: CRON_WATCH_WINDOW,
    p_limit: CRON_WATCH_LIMIT,
  });
  return cronWatchVerdict(parseCronFailures(data));
}
