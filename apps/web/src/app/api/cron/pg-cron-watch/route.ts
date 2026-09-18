import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { pgCronWatch } from "@/lib/cron/jobs/pg-cron-watch";

/**
 * GET /api/cron/pg-cron-watch. Reads the database scheduler's failed runs and alerts on each one.
 * Guarded by RECONCILE_CRON_SECRET, wrapped, reported, idempotent: see
 * lib/cron/run.ts and lib/cron/jobs/pg-cron-watch.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("pg-cron-watch", request, pgCronWatch);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("pg-cron-watch", request, pgCronWatch);
}
