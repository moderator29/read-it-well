import type { NextResponse } from "next/server";
import { photoHashBackfill } from "@/lib/cron/jobs/photo-hash-backfill";
import { runCronJob } from "@/lib/cron/run";

/**
 * GET /api/cron/photo-hash-backfill. C8: hashes listing photographs uploaded
 * before hashing existed, so the duplicate-photo signal works without a
 * person pressing the backfill button. Guarded by RECONCILE_CRON_SECRET,
 * wrapped and reported through lib/cron/run.ts like every job here; called
 * nightly by pg_cron (migration 20260930084536, applied 30 September 2026).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("photo-hash-backfill", request, (admin) => photoHashBackfill(admin));
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("photo-hash-backfill", request, (admin) => photoHashBackfill(admin));
}
