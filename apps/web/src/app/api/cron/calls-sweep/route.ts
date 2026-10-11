import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { callsSweep } from "@/lib/cron/jobs/calls-sweep";
import { VIDEO_CALLS_FLAG } from "@/lib/flags/read";

/**
 * GET /api/cron/calls-sweep. Closes the provider rooms of finished calls
 * (`lib/cron/jobs/calls-sweep.ts`), through the same wrapper and bearer guard
 * as every other job. Skipped, and said so, while `video_calls` is off.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("calls-sweep", request, callsSweep, { flag: VIDEO_CALLS_FLAG });
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("calls-sweep", request, callsSweep, { flag: VIDEO_CALLS_FLAG });
}
