import type { NextResponse } from "next/server";
import { landlordLine } from "@/lib/cron/jobs/landlord-line";
import { runCronJob } from "@/lib/cron/run";

/**
 * GET /api/cron/landlord-line. Asks consenting landlords what is due.
 *
 * V-31 and V-32. Guarded by RECONCILE_CRON_SECRET, wrapped and reported
 * through lib/cron/run.ts like every job here. A no-op while the
 * `landlord_line` flag is off, which it is until the founder turns it on.
 * See lib/cron/jobs/landlord-line.ts and lib/landlord/drain.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("landlord-line", request, (admin) => landlordLine(admin));
}

/** POST, for a hand-run that would rather not put a send behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("landlord-line", request, (admin) => landlordLine(admin));
}
