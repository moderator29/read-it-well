import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { accountPurge } from "@/lib/cron/jobs/account-purge";

/**
 * GET /api/cron/account-purge. Executes every account deletion whose thirty
 * day grace window has run out. Guarded by RECONCILE_CRON_SECRET, wrapped,
 * reported, idempotent: see lib/cron/run.ts and
 * lib/cron/jobs/account-purge.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("account-purge", request, accountPurge);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("account-purge", request, accountPurge);
}
