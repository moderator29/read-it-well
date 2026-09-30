import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { calendarSync } from "@/lib/cron/jobs/calendar-sync";

/**
 * GET /api/cron/calendar-sync. Pulls the Airbnb, Booking.com and other
 * calendars hosts have linked and closes the nights booked there (C2).
 * Guarded by RECONCILE_CRON_SECRET through lib/cron/run.ts; does nothing
 * unless CALENDAR_SYNC_ENABLED is on. See lib/cron/jobs/calendar-sync.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("calendar-sync", request, calendarSync);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("calendar-sync", request, calendarSync);
}
