import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { storeReadiness } from "@/lib/cron/jobs/store-readiness";

/**
 * GET /api/cron/store-readiness (V-52). Nightly: the nine store checks the
 * Store tab on /admin/operations runs on demand, against production, with one
 * audit row per run and a risk alert when any check is red. Bearer secret
 * through lib/cron/run.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("store-readiness", request, storeReadiness);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("store-readiness", request, storeReadiness);
}
