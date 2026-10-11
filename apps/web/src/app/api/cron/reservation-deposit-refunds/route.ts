import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { reservationDepositRefunds } from "@/lib/cron/jobs/reservation-deposit-refunds";

/**
 * GET /api/cron/reservation-deposit-refunds. D75: sends table deposit refunds
 * back to the card and closes unpaid deposit checkouts. Guarded by
 * RECONCILE_CRON_SECRET, wrapped and reported by lib/cron/run.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("reservation-deposit-refunds", request, reservationDepositRefunds);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("reservation-deposit-refunds", request, reservationDepositRefunds);
}
