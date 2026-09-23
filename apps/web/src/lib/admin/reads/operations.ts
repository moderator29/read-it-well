import "server-only";

import { VERCEL_JOBS, databaseJobsSummary, jobRow, type DatabaseJobsSummary, type RunRow } from "./jobs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PUSH_DELIVERY_STATES,
  PUSH_OUTCOMES,
  PUSH_QUEUE_STATES,
  type AlertTrend,
  type InspectionActivity,
  type InspectionState,
  type JobHealth,
  type PushActivity,
  type PushDeliveryRow,
  type PushDeliveryState,
} from "./shapes";
import {
  DAY_MS,
  UNAVAILABLE,
  adminReader,
  bucketSum,
  exactCount,
  lagosDay,
  lagosDayStartIso,
  lastDays,
  readAll,
  type Read,
} from "./shared";

/**
 * THE OPERATIONS DESK'S READS (01F7DFC7 panel two): scheduled job health,
 * the database jobs' summary, the alert trend and the daily run record.
 *
 * All from rows the platform already writes honestly: `lib/cron/report.ts`
 * writes one `audit_log` row per scheduled run, the money reconcile writes
 * `wallet.reconciliation.run`, and `risk_alerts` carries `created_at` and
 * `resolved_at` for every alert ever raised. Read through the operator's own
 * session under the admin SELECT policies on both tables.
 */

type AuditRunRow = { action: string; created_at: string; metadata: unknown };

function toRun(row: AuditRunRow | null | undefined): RunRow | null {
  return row ? { action: row.action, createdAt: row.created_at, metadata: row.metadata } : null;
}

/**
 * Every Vercel Cron job's last run: one read per job, newest first, so the
 * row returned is exactly the last run however long ago it was. The
 * database's pg_cron jobs are summarised from the newest watch run
 * (`pg-cron-watch` records failures, recoveries, never-run and overdue
 * counts); listing them one by one needs Request A5.
 */
export async function getJobHealth(
  now: number,
): Promise<Read<{ health: JobHealth; database: DatabaseJobsSummary | null }>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const reads = await Promise.all(
      VERCEL_JOBS.map((job) => {
        const query = db.from("audit_log").select("action, created_at, metadata");
        const scoped =
          job.audit.entityType === "cron_job"
            ? query.eq("entity_type", "cron_job").eq("entity_id", job.name)
            : query.eq("entity_type", "wallet_entry").eq("action", job.audit.term);
        return scoped.order("created_at", { ascending: false }).limit(1).maybeSingle();
      }),
    );
    if (reads.some((r) => r.error)) return UNAVAILABLE;
    const jobs = VERCEL_JOBS.map((job, i) => jobRow(job, toRun(reads[i]!.data as AuditRunRow | null), now));
    const watchIndex = VERCEL_JOBS.findIndex((j) => j.name === "pg-cron-watch");
    const watch = toRun(reads[watchIndex]?.data as AuditRunRow | null);
    return {
      state: "ok",
      data: {
        health: { jobs, checkedAt: new Date(now).toISOString() },
        database: databaseJobsSummary(watch),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** Runs per Lagos day and how many of them failed, for the jobs sparkline. */
export function assembleRunDays(
  days: readonly string[],
  runs: readonly { action: string; created_at: string }[],
): { day: string; runs: number; failed: number }[] {
  const all = bucketSum(
    runs.map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
    days,
  );
  const failed = bucketSum(
    runs.filter((r) => r.action.endsWith(".failed")).map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
    days,
  );
  return days.map((day, i) => ({ day, runs: all[i] ?? 0, failed: failed[i] ?? 0 }));
}

/** Fourteen days of scheduled runs (every row, not a page), for the jobs card. */
export async function getRunDays(now: number): Promise<Read<{ day: string; runs: number; failed: number }[]>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const days = lastDays(14, now);
    const rows = await readAll<{ action: string; created_at: string }>((from, to) =>
      db
        .from("audit_log")
        .select("action, created_at")
        .eq("entity_type", "cron_job")
        .gte("created_at", lagosDayStartIso(days[0]!))
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (!rows) return UNAVAILABLE;
    return { state: "ok", data: assembleRunDays(days, rows) };
  } catch {
    return UNAVAILABLE;
  }
}

/**
 * Open alerts now and as they stood seven days ago, from the alert rows'
 * own dates: an alert was open a week ago if it had been raised by then and
 * was not yet resolved. Exact counts, both.
 */
export async function getAlertTrend(now: number): Promise<Read<AlertTrend>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
    const days = lastDays(14, now);
    const [openNow, openWeekAgo, raised] = await Promise.all([
      exactCount(db.from("risk_alerts").select("id", { count: "exact", head: true }).eq("status", "open")),
      exactCount(
        db
          .from("risk_alerts")
          .select("id", { count: "exact", head: true })
          .lte("created_at", weekAgo)
          .or(`resolved_at.is.null,resolved_at.gt.${weekAgo}`),
      ),
      readAll<{ created_at: string }>((from, to) =>
        db
          .from("risk_alerts")
          .select("created_at")
          .gte("created_at", lagosDayStartIso(days[0]!))
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);
    if (openNow === null || openWeekAgo === null || !raised) return UNAVAILABLE;
    const opened = bucketSum(
      raised.map((r) => ({ key: lagosDay(r.created_at), amount: 1 })),
      days,
    );
    return {
      state: "ok",
      data: { openNow, openWeekAgo, daily: days.map((day, i) => ({ day, opened: opened[i] ?? 0 })) },
    };
  } catch {
    return UNAVAILABLE;
  }
}

export const INSPECTION_STATES = ["REQUESTED", "PROPOSED", "CONFIRMED", "COMPLETED", "DECLINED", "WITHDRAWN"] as const;

/**
 * Every inspection on the platform by state (six exact counts, under the
 * `inspection_requests_select_admin` policy) and the eight newest, with the
 * listing's title. Read only: an inspection is the requester's and the
 * lister's to move; the console watches it.
 */
export async function getInspectionActivity(): Promise<Read<InspectionActivity>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const counts = await Promise.all(
      INSPECTION_STATES.map((state) =>
        exactCount(db.from("inspection_requests").select("id", { count: "exact", head: true }).eq("state", state)),
      ),
    );
    if (counts.some((c) => c === null)) return UNAVAILABLE;
    const { data, error } = await db
      .from("inspection_requests")
      .select("id, state, requested_at, slot_at, outcome, listings ( title )")
      .order("requested_at", { ascending: false })
      .limit(8);
    if (error) return UNAVAILABLE;
    const byState = Object.fromEntries(INSPECTION_STATES.map((s, i) => [s, counts[i]!])) as InspectionActivity["byState"];
    return {
      state: "ok",
      data: {
        byState,
        total: Object.values(byState).reduce((a, b) => a + b, 0),
        recent: (data ?? []).map((row) => {
          const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings;
          return {
            id: row.id,
            state: row.state as InspectionState,
            listingTitle: (listing as { title?: string | null } | null)?.title ?? null,
            requestedAt: row.requested_at,
            slotAt: row.slot_at,
            outcome: row.outcome,
          };
        }),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

type RawDelivery = {
  id: string;
  platform: string | null;
  state: string;
  provider_status: number | null;
  provider_error: string | null;
  attempted_at: string;
};

/** One device attempt as the console shows it: no token, no device reference, the error cut short. Tested. */
export function pushDeliveryRow(raw: RawDelivery): PushDeliveryRow {
  const state = (PUSH_DELIVERY_STATES as readonly string[]).includes(raw.state) ? (raw.state as PushDeliveryState) : "failed";
  const error = raw.provider_error ? raw.provider_error.replace(/\s+/g, " ").trim().slice(0, 160) : null;
  return { id: raw.id, platform: raw.platform ?? "web", state, providerStatus: raw.provider_status, error: error || null, attemptedAt: raw.attempted_at };
}

/**
 * Push notifications (third closing audit): `push_queue` and
 * `push_deliveries`, both readable under their `*_staff_read` admin policies,
 * through the operator's own session. Exact counts of every queue row by the
 * state it is in now, of rows settled in the window by outcome, and of device
 * attempts in the window by state; the eight newest attempts, and the eight
 * newest that failed or found the device gone. Neither table is in the
 * generated types yet, so they are reached through an untyped view of the
 * same session client, reading only the columns their migration declares.
 */
export async function getPushActivity(now: number, days = 7): Promise<Read<PushActivity>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const loose = db as unknown as SupabaseClient;
    const fromIso = new Date(now - days * DAY_MS).toISOString();
    const count = (table: string) => loose.from(table).select("id", { count: "exact", head: true });
    const [queue, outcomes, deliveries] = await Promise.all([
      Promise.all(PUSH_QUEUE_STATES.map((state) => exactCount(count("push_queue").eq("state", state)))),
      Promise.all(PUSH_OUTCOMES.map((outcome) => exactCount(count("push_queue").eq("outcome", outcome).gte("settled_at", fromIso)))),
      Promise.all(PUSH_DELIVERY_STATES.map((state) => exactCount(count("push_deliveries").eq("state", state).gte("attempted_at", fromIso)))),
    ]);
    if ([...queue, ...outcomes, ...deliveries].some((c) => c === null)) return UNAVAILABLE;
    const columns = "id, platform, state, provider_status, provider_error, attempted_at";
    const [recent, failures] = await Promise.all([
      loose.from("push_deliveries").select(columns).order("attempted_at", { ascending: false }).limit(8),
      loose.from("push_deliveries").select(columns).in("state", ["failed", "gone"]).order("attempted_at", { ascending: false }).limit(8),
    ]);
    if (recent.error || failures.error) return UNAVAILABLE;
    const zip = <K extends string>(keys: readonly K[], values: (number | null)[]) =>
      Object.fromEntries(keys.map((k, i) => [k, values[i] ?? 0])) as Record<K, number>;
    return {
      state: "ok",
      data: {
        windowDays: days,
        queue: zip(PUSH_QUEUE_STATES, queue),
        outcomes: zip(PUSH_OUTCOMES, outcomes),
        deliveries: zip(PUSH_DELIVERY_STATES, deliveries),
        recent: ((recent.data ?? []) as RawDelivery[]).map(pushDeliveryRow),
        failures: ((failures.data ?? []) as RawDelivery[]).map(pushDeliveryRow),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
