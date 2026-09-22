import "server-only";

import {
  CRON_WATCH_LIMIT,
  CRON_WATCH_WINDOW,
  cronWatchVerdict,
  parseCronFailures,
  type JobVerdict,
} from "../../bookings/lifecycle";
import { recordAlert } from "../../alerts";
import {
  describeStaleJob,
  freshnessDetail,
  readLastRuns,
  readWatchingSince,
  staleJobs,
} from "../freshness";
import { callServiceFunction, type AdminClient } from "../rpc";
import { contentFilterAlert, readContentFilter } from "../content-filter";

/**
 * The watch on both schedulers, the database's and ours.
 *
 * ONE. THE DATABASE'S. Six pg_cron jobs run inside Postgres and, until this
 * job existed, nothing read `cron.job_run_details` (A2-121). It asks
 * `public.cron_job_failures` for every failed run in the window and raises one
 * alert naming the job, the run and the first line of the error. Where the run
 * table is not readable it says so in the envelope and raises nothing, so the
 * deploy notes own that gap rather than a false alarm.
 *
 * TWO. OURS, AND THIS HALF IS NEW. Every job in this folder reports a failure
 * loudly and a clean run quietly, and every one of those depends on the job
 * RUNNING. A cron entry lost in a config edit, a secret rotated on one side, a
 * project paused: the job simply never fires and raises nothing whatsoever,
 * which is the quietest failure this platform has. `lib/cron/freshness.ts`
 * reads the dated rows `lib/cron/report.ts` writes and names any watched job
 * that used to report and has gone quiet past its allowance. A job with no
 * history at all is counted in the envelope and never alerted, because that is
 * a deploy that has not happened yet rather than a job that has died.
 *
 * The two halves raise separately on purpose. A verdict carries one alert, and
 * "pg_cron job X failed" and "our own hold sweep has said nothing for seven
 * hours" are different emergencies for different people. The pg_cron alert
 * rides the verdict through the reporter; the freshness one is raised here,
 * through the same writer, with its own kind and its own subject.
 */
export async function pgCronWatch(admin: AdminClient): Promise<JobVerdict> {
  const data = await callServiceFunction(admin, "cron_job_failures", {
    p_since: CRON_WATCH_WINDOW,
    p_limit: CRON_WATCH_LIMIT,
  });
  const verdict = cronWatchVerdict(parseCronFailures(data));

  /* THE WATCH'S OWN HISTORY IS THE PROOF THAT THE SCHEDULER IS ALIVE, and it
     is what lets the rule below separate a job that was never deployed from a
     job that is simply not firing. This run is happening, so the scheduler
     reached us at least once; the oldest row says for how long it has been
     doing that. See lib/cron/freshness.ts. */
  const [runs, watchingSince, filter] = await Promise.all([
    readLastRuns(admin),
    readWatchingSince(admin),
    /* THREE. THE CONTENT FILTER, AND IT RIDES HERE FOR ONE REASON.
       An empty `public.blocked_terms` makes both post scanners skip the abuse
       branch silently: no error, no row, and every surface reporting on it
       says exactly what it would say if the filter were working. This job
       already exists to say the quiet part out loud on a schedule, so it is
       the right place to say this one. See lib/cron/content-filter.ts. */
    readContentFilter(admin),
  ]);
  const filterAlert = contentFilterAlert(filter);
  if (filterAlert) await recordAlert(filterAlert);

  const freshness = staleJobs(runs, Date.now(), { watchingSince });
  if (freshness.stale.length > 0) {
    await recordAlert({
      // A scheduled job that has stopped firing. Nothing else will ever say so.
      kind: "cron.schedule.silent",
      severity: "critical",
      detail: freshnessDetail(freshness),
      subjectId: "vercel-cron",
      subjectKind: "cron_job",
    });
  }

  return {
    // A silent schedule is attention even when pg_cron itself is clean.
    /* A platform taking user-generated content with no objectionable content
       filter in force is attention, whatever else is clean. */
    outcome:
      freshness.stale.length > 0 || filterAlert !== null ? "attention" : verdict.outcome,
    counts: {
      ...verdict.counts,
      stale_jobs: freshness.stale.length,
      never_ran: freshness.neverRan.length,
      /* Reported on EVERY run, clean or not, so "the filter is on" stops being
         something anybody has to take on trust. -1 means it could not be read,
         which is a different fact from zero and is never collapsed into it. */
      blocked_terms: filter.terms ?? -1,
    },
    detail: {
      ...verdict.detail,
      stale: freshness.stale.map(describeStaleJob),
      never_ran: freshness.neverRan,
      content_filter_in_force: filter.reason === null,
    },
    alert: verdict.alert,
  };
}
