import type { NextResponse } from "next/server";
import { sanctionsScreen } from "@/lib/cron/jobs/sanctions";
import { runCronJob } from "@/lib/cron/run";

/**
 * GET /api/cron/sanctions-screen. SCUML items 8 and 9, sanctions screening.
 *
 * Guarded by RECONCILE_CRON_SECRET, wrapped and reported through
 * lib/cron/run.ts like every job here. See lib/cron/jobs/sanctions.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("sanctions-screen", request, (admin) => sanctionsScreen(admin));
}

/** POST, for a hand-run. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("sanctions-screen", request, (admin) => sanctionsScreen(admin));
}
