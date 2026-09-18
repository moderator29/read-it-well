import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { completeStays } from "@/lib/cron/jobs/complete-stays";

/**
 * GET /api/cron/complete-stays. Moves paid CONFIRMED stays whose check-out day has passed to COMPLETED.
 * Guarded by RECONCILE_CRON_SECRET, wrapped, reported, idempotent: see
 * lib/cron/run.ts and lib/cron/jobs/complete-stays.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("complete-stays", request, completeStays);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("complete-stays", request, completeStays);
}
