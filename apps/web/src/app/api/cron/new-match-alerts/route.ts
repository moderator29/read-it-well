import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { newMatchAlerts } from "@/lib/cron/jobs/new-match-alerts";

/**
 * GET /api/cron/new-match-alerts (V-15). Every five minutes: tells the people
 * watching a saved search about a listing published minutes ago, three times a
 * day at most, and leaves the rest to the morning digest. Bearer secret through
 * lib/cron/run.ts; the job is lib/cron/jobs/new-match-alerts.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("new-match-alerts", request, newMatchAlerts);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("new-match-alerts", request, newMatchAlerts);
}
