import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { savedSearchAlerts } from "@/lib/cron/jobs/saved-search-alerts";

/**
 * GET /api/cron/saved-search-alerts. Re-runs every saved search whose alert is on and tells each person once about what went up.
 * Guarded by RECONCILE_CRON_SECRET, wrapped, reported, idempotent: see
 * lib/cron/run.ts and lib/cron/jobs/saved-search-alerts.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("saved-search-alerts", request, savedSearchAlerts);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("saved-search-alerts", request, savedSearchAlerts);
}
