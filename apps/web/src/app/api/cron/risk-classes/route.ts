import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { riskClasses } from "@/lib/cron/jobs/risk-classes";

/**
 * GET /api/cron/risk-classes. SCUML item 15: classifies every customer whose
 * risk class is missing or due. Guarded, wrapped and reported by
 * lib/cron/run.ts; the rules are lib/compliance/risk-rules.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("risk-classes", request, riskClasses);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("risk-classes", request, riskClasses);
}
