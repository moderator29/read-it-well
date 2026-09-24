import type { NextResponse } from "next/server";

import { runCronJob } from "@/lib/cron/run";
import { pushDrain } from "@/lib/push/drain";

/**
 * GET /api/push/drain. The push queue, once.
 *
 * Wrapped by `lib/cron/run.ts` exactly like the six jobs under
 * `/api/cron/*`: the same bearer guard, the same 429 after thirty bad
 * secrets from one address, the same 503 when the service key is missing so
 * the scheduler's own dashboard turns red rather than green, the same report
 * and the same JSON envelope. Nothing about this job's plumbing is new, which
 * is the point: a new job that invents its own guard is a new job with its
 * own new way of being wrong.
 *
 * IT LIVES UNDER `/api/push` RATHER THAN `/api/cron` ONLY BECAUSE OF WHO OWNS
 * WHICH DIRECTORY on this build, and nothing else follows from it.
 *
 * HOW IT IS CALLED, AND WHY THERE ARE TWO ANSWERS. The other jobs are
 * scheduled in `apps/web/vercel.json`, and this one is not listed there. It is
 * scheduled from the database instead: `private.request_push_drain()` (its own
 * migration) calls this route through pg_net every five minutes, AND READS
 * THE REPLY OF ITS PREVIOUS CALL before making the next one. A queue whose
 * drain is never called is the failure this whole build is written against,
 * so it does not depend on a line in another file.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron and pg_net both issue a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("push-drain", request, pushDrain);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("push-drain", request, pushDrain);
}
