import "server-only";

import { NextResponse } from "next/server";
import { recordAlert, type AlertInput } from "../alerts";
import { ROUTE_FAILURE_LIMITS, countRouteFailure } from "../security/money-limits";
import { createAdminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/env";
import type { JobVerdict } from "../bookings/lifecycle";
import { cronAuthVerdict, fromPlatformScheduler, type CronAuthVerdict } from "./auth";
import { reportCronRun } from "./report";
import type { AdminClient } from "./rpc";

/**
 * The one wrapper every scheduled job runs through.
 *
 * A job is a function from a service client to a verdict, nothing more. This
 * file does everything around it, once, so a job cannot forget any of it: the
 * bearer guard (401, and 429 after thirty bad secrets from one address, the
 * same count the reconcile route keeps), the service client (503 when the
 * key is missing, so the scheduler's own dashboard turns red instead of
 * green), the clock, the catch-all, the report through lib/cron/report.ts,
 * and the JSON envelope the scheduler and a person reading the logs both get.
 *
 * `executeCronJob` is the whole decision with its dependencies handed in, so
 * a test can drive every branch without a request, a key or a database.
 * `runCronJob` is the same thing bound to the real request and the real
 * client.
 */

export type CronJob = (admin: AdminClient) => Promise<JobVerdict>;

export type CronEnvelope =
  | {
      ok: true;
      job: string;
      outcome: "ok" | "attention";
      startedAt: string;
      durationMs: number;
      counts: Record<string, number>;
      detail: Record<string, unknown>;
    }
  | {
      ok: false;
      job: string;
      reason: string;
      startedAt: string;
      durationMs: number;
    };

export type CronOutcome = { status: number; body: CronEnvelope; retryAfterSeconds?: number };

export type CronDeps = {
  /** null when the bearer matched; otherwise how long a sprayer must wait, 0 for a plain refusal. */
  refused: null | { retryAfterSeconds: number };
  admin: AdminClient | null;
  report: typeof reportCronRun;
  now: () => number;
};

export async function executeCronJob(name: string, job: CronJob, deps: CronDeps): Promise<CronOutcome> {
  const started = deps.now();
  const startedAt = new Date(started).toISOString();

  if (deps.refused) {
    if (deps.refused.retryAfterSeconds > 0) {
      return {
        status: 429,
        body: { ok: false, job: name, reason: "too_many_failures", startedAt, durationMs: 0 },
        retryAfterSeconds: deps.refused.retryAfterSeconds,
      };
    }
    console.warn(`[cron] ${name} rejected: cron_secret_invalid`);
    return {
      status: 401,
      body: { ok: false, job: name, reason: "unauthorised", startedAt, durationMs: 0 },
    };
  }

  if (!deps.admin) {
    await deps.report(null, {
      job: name,
      outcome: "failed",
      durationMs: 0,
      reason: "service_role_key_missing",
    });
    return {
      status: 503,
      body: { ok: false, job: name, reason: "service_role_key_missing", startedAt, durationMs: 0 },
    };
  }

  let verdict: JobVerdict;
  try {
    verdict = await job(deps.admin);
  } catch (error) {
    const durationMs = deps.now() - started;
    const reason = error instanceof Error ? error.message.slice(0, 200) : "job threw";
    await deps.report(deps.admin, { job: name, outcome: "failed", durationMs, reason });
    return {
      status: 500,
      body: { ok: false, job: name, reason, startedAt, durationMs },
    };
  }

  const durationMs = deps.now() - started;
  await deps.report(deps.admin, {
    job: name,
    outcome: verdict.outcome,
    durationMs,
    counts: verdict.counts,
    alert: verdict.alert,
  });
  return {
    status: 200,
    body: {
      ok: true,
      job: name,
      outcome: verdict.outcome,
      startedAt,
      durationMs,
      counts: verdict.counts,
      detail: verdict.detail,
    },
  };
}

/** A service client, or null when this process cannot have one. */
function adminOrNull(): AdminClient | null {
  if (!isSupabaseConfigured()) return null;
  if ((process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length === 0) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * WHAT A REFUSAL MEANS, WHICH IS NOT THE SAME THING AS WHAT IT IS.
 *
 * A 401 here is one of two entirely different events wearing the same status
 * code. From an address nobody knows it is somebody trying a door, and a
 * warning is the right colour for it. From our own scheduler it is THE JOB
 * DID NOT RUN, and it will keep not running, on the hour, until a person
 * changes a secret. See `lib/cron/auth.ts` for the 256 rows that were on this
 * project's desk saying the first thing while meaning the second.
 *
 * The alert therefore names the outcome rather than the attempt: the job did
 * not run, it has not run since the secret stopped matching, and the fix is
 * `RECONCILE_CRON_SECRET` on the host equalling `CRON_SECRET` on the
 * scheduler (docs/DEPLOY.md, section 2).
 */
/**
 * The fix line, chosen by WHICH refusal this was rather than printed blind.
 *
 * The old line always read "RECONCILE_CRON_SECRET must equal CRON_SECRET",
 * which is true, unhelpful when both are already set, and actively misleading
 * on 22 September when the real fault was that the scheduler's variable was
 * named `CRONS_SECRET` and therefore read by nobody. A fix line that is right
 * in general and wrong in particular sends people to check the thing they
 * have already checked.
 */
function fixFor(verdict: CronAuthVerdict): string {
  switch (verdict) {
    case "no-bearer":
      return "The scheduler sent NO bearer at all, so Vercel is injecting nothing: the variable it reads must be named exactly CRON_SECRET, in this environment. Check the name before the value.";
    case "no-secret-configured":
      return "RECONCILE_CRON_SECRET is unset or empty on this deployment, so the door refuses every caller including a correct one.";
    case "secret-mismatch":
      return "A bearer arrived and did not match: RECONCILE_CRON_SECRET on the host must equal CRON_SECRET on the scheduler.";
    default:
      return "";
  }
}

export function refusalAlert(
  name: string,
  scheduler: boolean,
  verdict: CronAuthVerdict = "secret-mismatch",
): AlertInput {
  const token = name.replace(/-/g, "_");
  return scheduler
    ? {
        kind: `cron.${token}.locked_out`,
        severity: "critical",
        detail: {
          http_status: 401,
          scheduler: "vercel-cron",
          ran: false,
          reason: verdict,
          fix: fixFor(verdict),
        },
        subjectId: name,
        subjectKind: "cron_job",
      }
    : {
        kind: `cron.${token}.unauthorised`,
        severity: "warning",
        detail: { http_status: 401, scheduler: "unknown", ran: false, reason: verdict },
        subjectId: name,
        subjectKind: "cron_job",
      };
}

/**
 * The guard's verdict for a real request. A bad secret is counted per
 * address and told to the desk once, exactly as the reconcile route does.
 *
 * THE SPRAY LIMIT NEVER SILENCES OUR OWN SCHEDULER. A refused caller that is
 * spraying gets a 429 and nothing on the desk, which is correct for a
 * stranger and is the wrong way round for us: the limiter counts per address,
 * so thirty refused runs from the platform's own range would have taken the
 * only remaining signal away at exactly the point the outage was most
 * certain. The 429 still goes back; the alert goes up either way.
 */
async function refusal(name: string, request: Request): Promise<CronDeps["refused"]> {
  const verdict = cronAuthVerdict(request);
  if (verdict === "ok") return null;
  const scheduler = fromPlatformScheduler(request);
  const spray = await countRouteFailure(ROUTE_FAILURE_LIMITS.cronBadSecret, request.headers);
  if (!spray.allowed && !scheduler) return { retryAfterSeconds: spray.retryAfterSeconds };
  await recordAlert(refusalAlert(name, scheduler, verdict));
  if (!spray.allowed) return { retryAfterSeconds: spray.retryAfterSeconds };
  return { retryAfterSeconds: 0 };
}

/** Run a job for a request and answer it. Vercel Cron issues a GET. */
export async function runCronJob(name: string, request: Request, job: CronJob): Promise<NextResponse> {
  const outcome = await executeCronJob(name, job, {
    refused: await refusal(name, request),
    admin: adminOrNull(),
    report: reportCronRun,
    now: Date.now,
  });
  const headers =
    outcome.retryAfterSeconds !== undefined
      ? { "retry-after": String(outcome.retryAfterSeconds) }
      : undefined;
  return NextResponse.json(outcome.body, { status: outcome.status, headers });
}
