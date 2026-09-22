import { getLocale } from "@/lib/locale";
import { getQueueCounts, getRiskAlerts } from "@/lib/admin/queries";
import { getJobHealth } from "@/lib/admin/reads/operations";
import {
  getCollectedSeries,
  getConsolePulse,
  getNewListingsByRole,
  getSupplyByType,
} from "@/lib/admin/reads/overview";
import type { CollectedRange } from "@/lib/admin/reads/shapes";
import { LiveRefresh } from "./_components/LiveRefresh";
import { OverviewView } from "./_components/OverviewView";

export const dynamic = "force-dynamic";

const RANGES: readonly CollectedRange[] = ["30d", "90d", "12m"];

/** The request's clock, read once so every "12m ago" on the page agrees. */
function requestTime(): number {
  return Date.now();
}

/**
 * The console's front door, and where entering the console always lands:
 * nothing under `app/admin`, the proxy or the drawer sends an operator to a
 * desk first (the drawer's Console row links `/admin`).
 *
 * Every figure is read under the admin gate the layout already applied,
 * through the operator's own session (`lib/admin/reads/`), plus the existing
 * `getQueueCounts` and `getRiskAlerts`. A read that fails is drawn as not
 * loaded on its own panel; the others still draw. The page refreshes itself
 * every minute while it is open (`LiveRefresh`).
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

  const [pulse, collected, supply, byRole, jobs, counts, alerts] = await Promise.all([
    getConsolePulse(now),
    getCollectedSeries(range, now),
    getSupplyByType(),
    getNewListingsByRole(now),
    getJobHealth(now),
    getQueueCounts(),
    getRiskAlerts(),
  ]);
  const ok = <T,>(read: { state: "ok"; data: T } | { state: "unavailable" }): T | null =>
    read.state === "ok" ? read.data : null;

  return (
    <>
      <LiveRefresh />
      <OverviewView
        locale={locale}
        now={now}
        range={range}
        pulse={ok(pulse)}
        openReviews={counts.state === "ok" ? counts.data.listings : null}
        collected={ok(collected)}
        supply={ok(supply)}
        byRole={ok(byRole)}
        jobs={jobs.state === "ok" ? jobs.data.health : null}
        alerts={alerts.state === "ok" ? alerts.data.rows : "unavailable"}
      />
    </>
  );
}
