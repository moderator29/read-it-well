import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { rentShareRefunds } from "@/lib/cron/jobs/rent-share-refunds";

/**
 * GET /api/cron/rent-share-refunds. Sends pending flatmate share refunds
 * (V-86) back to the card through Paystack. Guarded by RECONCILE_CRON_SECRET,
 * wrapped and reported by lib/cron/run.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("rent-share-refunds", request, rentShareRefunds);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("rent-share-refunds", request, rentShareRefunds);
}
