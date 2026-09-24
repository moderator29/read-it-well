import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { catalogueCanary } from "@/lib/ops/catalogue-canary";

/**
 * V-01: the catalogue canary, every five minutes (`vercel.json`). The check
 * and its reasons are in `lib/ops/catalogue-canary.ts`; a failure is a
 * critical `canary.catalogue` alert, which pages a person.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("canary", request, catalogueCanary);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("canary", request, catalogueCanary);
}
