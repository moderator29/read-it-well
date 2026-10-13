import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { arrangementsReconcile } from "@/lib/cron/jobs/arrangements-reconcile";

/**
 * GET /api/cron/arrangements-reconcile. Escrow arrangements still waiting on
 * the payment partner's word are read back and recorded (at most three a
 * run). Guarded by the cron bearer, wrapped, reported and idempotent: see
 * lib/cron/run.ts and lib/cron/jobs/arrangements-reconcile.ts.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("arrangements-reconcile", request, arrangementsReconcile);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("arrangements-reconcile", request, arrangementsReconcile);
}
