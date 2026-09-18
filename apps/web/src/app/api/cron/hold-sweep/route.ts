import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { holdSweep } from "@/lib/cron/jobs/hold-sweep";

/**
 * GET /api/cron/hold-sweep. Releases PENDING bookings older than the hold window.
 * Guarded by RECONCILE_CRON_SECRET, wrapped, reported, idempotent: see
 * lib/cron/run.ts and lib/cron/jobs/hold-sweep.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("hold-sweep", request, holdSweep);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("hold-sweep", request, holdSweep);
}
