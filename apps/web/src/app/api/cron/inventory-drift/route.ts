import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { inventoryDrift } from "@/lib/cron/jobs/inventory-drift";

/**
 * GET /api/cron/inventory-drift. Compares sold counts against live bookings and alerts on any disagreement; corrects nothing.
 * Guarded by RECONCILE_CRON_SECRET, wrapped, reported, idempotent: see
 * lib/cron/run.ts and lib/cron/jobs/inventory-drift.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("inventory-drift", request, inventoryDrift);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("inventory-drift", request, inventoryDrift);
}
