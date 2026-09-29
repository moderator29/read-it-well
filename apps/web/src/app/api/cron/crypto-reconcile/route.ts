import type { NextResponse } from "next/server";
import { runCronJob } from "@/lib/cron/run";
import { activeProvider } from "@/lib/crypto/providers";
import { reconcileCryptoPayments, reconcileVerdict } from "@/lib/crypto/reconcile";

/**
 * The crypto reconcile job (lib/crypto/reconcile.ts): every crypto payment
 * still moving is read back from the provider and applied through the same
 * idempotent door the webhook uses. Authenticated and alerted by
 * `runCronJob` like every other scheduled job. With crypto off there is
 * nothing moving, and a run is a no-op.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const job = async (admin: Parameters<typeof reconcileCryptoPayments>[0]) =>
  reconcileVerdict(await reconcileCryptoPayments(admin, activeProvider()));

export async function GET(request: Request): Promise<NextResponse> {
  return runCronJob("crypto-reconcile", request, job);
}

export async function POST(request: Request): Promise<NextResponse> {
  return runCronJob("crypto-reconcile", request, job);
}
