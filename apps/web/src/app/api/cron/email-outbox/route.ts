import type { NextResponse } from "next/server";
import { emailOutbox } from "@/lib/cron/jobs/email-outbox";
import { runCronJob } from "@/lib/cron/run";

/**
 * GET /api/cron/email-outbox. Sends the mail that database triggers queued.
 *
 * The other end of `public.email_outbox`. Guarded by RECONCILE_CRON_SECRET,
 * wrapped, reported and idempotent: see lib/cron/run.ts, lib/notify/outbox.ts
 * and lib/cron/jobs/email-outbox.ts.
 *
 * FOUR TIMES AN HOUR RATHER THAN ONCE, and it is the only job on this
 * deployment that runs faster than hourly. The queue carries a password change
 * and a new device sign-in, and those two are worth something only while
 * somebody can still act on them: an hour between a stolen password and the
 * email about it is an hour an attacker has to change the address, the phone
 * and the payout account. Fifteen minutes is the compromise between that and
 * the platform scheduler's floor.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("email-outbox", request, (admin) => emailOutbox(admin));
}

/** POST, for a hand-run that would rather not put a send behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("email-outbox", request, (admin) => emailOutbox(admin));
}
