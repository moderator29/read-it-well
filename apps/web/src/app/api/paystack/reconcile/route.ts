import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logMoney } from "@/lib/payments/observability";
import { getAdminClient } from "@/lib/wallet/ledger";
import { recordMoneyAudit } from "@/lib/wallet/audit";
import {
  DEFAULT_SWEEP_HOURS,
  runMoneyReconciliation,
} from "@/lib/wallet/reconciliation";
import { recordAlert } from "@/lib/alerts";
import { failureReason } from "@/lib/payments/observability";
import { ROUTE_FAILURE_LIMITS, countRouteFailure } from "@/lib/security/money-limits";

/**
 * The scheduled money reconciliation.
 *
 * WHY THIS IS AN HTTP ENDPOINT AND NOT A pg_cron JOB. Six pg_cron jobs already
 * run on this database and not one of them touches money. Three of the four
 * checks reconciliation has to make can only be made from here, because they
 * require asking PAYSTACK what it actually charged and what became of each
 * transfer. Postgres cannot do that. The database-side halves already exist and
 * have never been called: private.wallets_overdrawn() and
 * private.stale_withdrawal_holds(). This job calls their equivalents on every
 * run, so the two checks that could have run in the database for months
 * actually run now.
 *
 * WHAT IT DOES, EVERY RUN:
 *  1. Asks Paystack for every successful charge in the window and compares them
 *     against wallet_entries and transactions. A funding gap is posted; a
 *     booking gap is reported loudly and left for a human.
 *  2. Asks Paystack what became of every PENDING withdrawal hold older than the
 *     timeout, and settles or releases each one on the processor's answer. This
 *     is the only thing standing between a lost transfer webhook and somebody's
 *     balance being held forever.
 *  3. Reports any wallet whose derived balance has gone below zero.
 *
 * HOW IT IS AUTHENTICATED. A bearer token compared in constant time against
 * RECONCILE_CRON_SECRET, which is exactly the header Vercel Cron sends. When
 * the secret is not set the endpoint refuses everything: an unauthenticated
 * endpoint that can move money is worse than a job that does not run, and a
 * job that does not run says so in the log on every attempt.
 *
 * WHAT IT ANSWERS. A summary with counts and kobo, never a customer email and
 * never a raw processor payload. Non-2xx when the run could not happen, so a
 * scheduler's own failure log is honest about it.
 *
 * DEFAULT IS DRY. `?apply=1` is required before anything is written, so the
 * first run against a live database can only ever report. Wire the schedule
 * with apply once a dry run has been read.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** How far back a scheduled run looks, capped so one call cannot page forever. */
const MAX_HOURS = 24 * 30;

function refused(reason: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, reason }, { status });
}

/** Constant-time bearer comparison. False on any shape we do not recognise. */
function authorised(request: Request): boolean {
  const expected = process.env.RECONCILE_CRON_SECRET ?? "";
  if (expected.length === 0) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (presented.length === 0) return false;

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(presented, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function run(request: Request): Promise<NextResponse> {
  if (!authorised(request)) {
    /* Failures per address, so a guessed secret is answered from the deny
       cache after thirty tries and the desk hears about it once. */
    const spray = await countRouteFailure(ROUTE_FAILURE_LIMITS.cronBadSecret, request.headers);
    if (!spray.allowed) {
      return NextResponse.json(
        { ok: false, reason: "too_many_failures" },
        { status: 429, headers: { "retry-after": String(spray.retryAfterSeconds) } },
      );
    }
    logMoney({ surface: "reconcile", outcome: "rejected", reason: "cron_secret_invalid" });
    await recordAlert({
      kind: "cron.reconcile.unauthorised",
      severity: "warning",
      detail: { http_status: 401 },
      subjectId: "paystack-reconcile",
    });
    return refused("unauthorised", 401);
  }

  const admin = getAdminClient();
  if (!admin) {
    // The failure that started all of this. It gets a 503, not a 200, so the
    // scheduler's own dashboard turns red instead of green.
    logMoney({
      surface: "reconcile",
      outcome: "unconfigured",
      reason: "service_role_key_missing",
    });
    await recordAlert({
      kind: "cron.reconcile.unconfigured",
      severity: "critical",
      detail: { reason: "service_role_key_missing" },
      subjectId: "paystack-reconcile",
    });
    return refused("service_role_key_missing", 503);
  }

  const url = new URL(request.url);
  const apply = url.searchParams.get("apply") === "1";
  const hoursParam = Number(url.searchParams.get("hours") ?? DEFAULT_SWEEP_HOURS);
  const hours =
    Number.isFinite(hoursParam) && hoursParam > 0
      ? Math.min(Math.trunc(hoursParam), MAX_HOURS)
      : DEFAULT_SWEEP_HOURS;

  let report: Awaited<ReturnType<typeof runMoneyReconciliation>>;
  try {
    report = await runMoneyReconciliation(admin, { hours, apply, actor: { kind: "sweep" } });
  } catch (error) {
    /* A run that threw is the one outcome the scheduler's own log cannot
       explain. 500 so it shows red there, and a critical alert so it shows
       on the desk with the reason beside it. */
    const reason = failureReason(error);
    logMoney({ surface: "reconcile", outcome: "failed", reason: `run_threw:${reason}` });
    await recordAlert({
      kind: "cron.reconcile.failed",
      severity: "critical",
      detail: { hours, apply, reason },
      subjectId: "paystack-reconcile",
    });
    return refused("run_failed", 500);
  }

  /*
   * Every run records its outcome, not only the bad ones (A2-121): a job that
   * has stopped firing is invisible unless its last "clean" row has a date on
   * it. A run that needs a human is a warning with the counts in the detail.
   */
  await recordAlert({
    kind: report.needsAttention ? "cron.reconcile.needs_attention" : "cron.reconcile.run",
    severity: report.needsAttention ? "warning" : "info",
    detail: {
      hours,
      apply,
      charges_seen: report.charges.chargesSeen,
      charges_ours: report.charges.chargesOurs,
      gaps: report.charges.gaps.length,
      recovered_minor: report.charges.recoveredMinor,
      holds_examined: report.holds.examined,
      released_minor: report.holds.releasedMinor,
      overdrawn: report.overdrawn.length,
    },
    subjectId: "paystack-reconcile",
  });

  await recordMoneyAudit(admin, {
    actor: { kind: "sweep" },
    action: "wallet.reconciliation.run",
    reference: null,
    outcome: report.needsAttention ? "needs_attention" : "clean",
    detail: {
      hours,
      apply,
      charges_seen: report.charges.chargesSeen,
      charges_ours: report.charges.chargesOurs,
      gaps: report.charges.gaps.length,
      recovered_minor: report.charges.recoveredMinor,
      holds_examined: report.holds.examined,
      released_minor: report.holds.releasedMinor,
      overdrawn: report.overdrawn.length,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      apply,
      window: { from: report.charges.from, to: report.charges.to, hours },
      charges: {
        seen: report.charges.chargesSeen,
        ours: report.charges.chargesOurs,
        unavailable: report.charges.unavailable,
        reason: report.charges.reason,
        recoveredMinor: report.charges.recoveredMinor,
        gaps: report.charges.gaps,
      },
      holds: {
        examined: report.holds.examined,
        releasedMinor: report.holds.releasedMinor,
        unavailable: report.holds.unavailable,
        resolutions: report.holds.resolutions,
      },
      overdrawn: report.overdrawn,
      needsAttention: report.needsAttention,
    },
    { status: 200 },
  );
}

/** Vercel Cron issues a GET. */
export async function GET(request: Request): Promise<NextResponse> {
  return run(request);
}

/** POST, for anything that would rather not put a run behind a GET. */
export async function POST(request: Request): Promise<NextResponse> {
  return run(request);
}
