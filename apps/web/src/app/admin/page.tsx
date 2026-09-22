import { getLocale } from "@/lib/locale";
import { getAuditLog } from "@/lib/admin/audit-queries";
import { getQueueCounts, getRiskAlerts } from "@/lib/admin/queries";
import { getPlatformStats } from "@/lib/platform-stats";
import type { CollectedRange, JobHealth } from "./_components/console-shapes";
import { VERCEL_JOBS, jobRow } from "./_components/jobs";
import { LiveRefresh } from "./_components/LiveRefresh";
import { OverviewView } from "./_components/OverviewView";

export const dynamic = "force-dynamic";

const RANGES: readonly CollectedRange[] = ["30d", "90d", "12m"];

/** The request's clock, read once so every "12m ago" on the page agrees. */
function requestTime(): number {
  return Date.now();
}

/**
 * The console's front door, and it is where entering the console always
 * lands (nothing under `app/admin` redirects away from `/admin`).
 *
 * THE READS, every one through `lib/admin` or an existing platform read,
 * under the admin gate the layout has already applied:
 * - `getPlatformStats()` for live listings (published, examples excluded);
 * - `getQueueCounts()` for the listings waiting on a decision;
 * - `getRiskAlerts()` for the five newest alerts;
 * - `getAuditLog()` once per scheduled job, newest first, for the last run
 *   of each (see `_components/jobs.ts`).
 *
 * The strip's sign-ups and money, the four cards' week-on-week changes, the
 * money chart, supply by type and the lister-role chart need queries that do
 * not exist yet. They are passed as null and each panel says so and names
 * its request (docs/SESSION_B_SCOPE.md, Requests A1 to A4).
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const range = RANGES.find((r) => r === params.range) ?? "12m";
  const now = requestTime();

  const [stats, counts, alerts, jobReads] = await Promise.all([
    getPlatformStats(),
    getQueueCounts(),
    getRiskAlerts(),
    Promise.all(
      VERCEL_JOBS.map((job) => getAuditLog({ status: job.audit.entityType, q: job.audit.term })),
    ),
  ]);

  const jobs: JobHealth | null = jobReads.every((read) => read.state === "ok")
    ? {
        checkedAt: new Date(now).toISOString(),
        jobs: VERCEL_JOBS.map((job, i) => {
          const read = jobReads[i]!;
          return jobRow(job, read.state === "ok" ? (read.data.rows[0] ?? null) : null, now);
        }),
      }
    : null;

  return (
    <>
      <LiveRefresh />
      <OverviewView
        locale={locale}
        now={now}
        range={range}
        liveListings={stats ? stats.listings : null}
        openReviews={counts.state === "ok" ? counts.data.listings : null}
        pulse={null}
        collected={null}
        supply={null}
        byRole={null}
        jobs={jobs}
        alerts={alerts.state === "ok" ? alerts.data.rows : "unavailable"}
      />
    </>
  );
}
