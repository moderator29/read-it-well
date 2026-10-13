import type { NotificationActivity } from "./shapes";

/**
 * THE OPERATIONS PANELS' STAFF READS (draft op01_operations_reads.sql), as
 * pure parsers so they can be tested without a database.
 *
 * Each panel reads one `staff_ops_*` function. Until that draft is applied
 * the function does not exist and PostgREST says so (PGRST202 / 42883): the
 * read is then `missing` and the panel keeps its "not readable by an admin
 * yet" note. A function that exists but fails is `unavailable`, drawn as a
 * failed read, never as an empty one.
 */
export type OpsRead<T> = { state: "ok"; data: T } | { state: "missing" } | { state: "unavailable" };

export type RpcError = { code?: string; message?: string } | null | undefined;

export function isMissingOpsFunction(error: RpcError): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "42883" || /could not find the function/i.test(error.message ?? "");
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function counts(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(obj(v))) out[k] = num(n);
  return out;
}

export type DeletionRow = { memberRef: string; status: string; requestedAt: string | null; purgeAfter: string | null; attempts: number; lastError: string | null };
export type DeletionsRead = { byStatus: Record<string, number>; rows: DeletionRow[]; waiting: number };

export function parseDeletions(data: unknown): DeletionsRead | null {
  const d = obj(data);
  if (!("rows" in d)) return null;
  const byStatus = counts(d.by_status);
  return {
    byStatus,
    waiting: (byStatus.SCHEDULED ?? 0) + (byStatus.PURGING ?? 0),
    rows: arr(d.rows).map((r) => {
      const o = obj(r);
      return { memberRef: str(o.member_ref) ?? "", status: str(o.status) ?? "", requestedAt: str(o.requested_at), purgeAfter: str(o.purge_after), attempts: num(o.attempts), lastError: str(o.last_error) };
    }),
  };
}

export type TransferRow = { id: string; business: string | null; from: string | null; to: string | null; status: string; offeredAt: string | null; expiresAt: string | null; respondedAt: string | null };
export type TransfersRead = { byStatus: Record<string, number>; rows: TransferRow[]; waiting: number };

export function parseTransfers(data: unknown): TransfersRead | null {
  const d = obj(data);
  if (!("rows" in d)) return null;
  const byStatus = counts(d.by_status);
  return {
    byStatus,
    waiting: byStatus.PENDING ?? 0,
    rows: arr(d.rows).map((r) => {
      const o = obj(r);
      return { id: str(o.id) ?? "", business: str(o.business), from: str(o.from_name), to: str(o.to_name), status: str(o.status) ?? "", offeredAt: str(o.offered_at), expiresAt: str(o.expires_at), respondedAt: str(o.responded_at) };
    }),
  };
}

export type DbJobRow = { name: string; schedule: string; active: boolean; lastStatus: string | null; lastStart: string | null; lastMs: number | null; lastMessage: string | null; failed24h: number };
export type DbJobsRead = { available: boolean; jobs: DbJobRow[]; failing: number };

export type DbJobState = "failed" | "paused" | "never" | "ok";
export function dbJobState(j: DbJobRow): DbJobState {
  if (!j.active) return "paused";
  if (j.failed24h > 0 || j.lastStatus === "failed") return "failed";
  if (!j.lastStart) return "never";
  return "ok";
}

export function parseDbJobs(data: unknown): DbJobsRead | null {
  const d = obj(data);
  if (typeof d.available !== "boolean") return null;
  const jobs = arr(d.jobs).map((r) => {
    const o = obj(r);
    return {
      name: str(o.name) ?? "",
      schedule: str(o.schedule) ?? "",
      active: o.active !== false,
      lastStatus: str(o.last_status),
      lastStart: str(o.last_start),
      lastMs: typeof o.last_ms === "number" ? o.last_ms : null,
      lastMessage: str(o.last_message),
      failed24h: num(o.failed_24h),
    };
  });
  return { available: d.available, jobs, failing: jobs.filter((j) => dbJobState(j) === "failed").length };
}

export type ReconRead = { lastRequestedAt: string | null; lastVerdict: string | null; lastJudgedAt: string | null; runs: { action: string; at: string }[]; openAlerts: number };

export function parseRecon(data: unknown): ReconRead | null {
  const d = obj(data);
  if (!("runs" in d)) return null;
  const w = obj(d.watch);
  return {
    lastRequestedAt: str(w.last_requested_at),
    lastVerdict: str(w.last_verdict),
    lastJudgedAt: str(w.last_judged_at),
    runs: arr(d.runs).map((r) => ({ action: str(obj(r).action) ?? "", at: str(obj(r).at) ?? "" })).filter((r) => r.at),
    openAlerts: num(d.open_alerts),
  };
}

/** A reconcile verdict the watch writes is `ok_2xx` when the reconciler answered. */
export function reconHealthy(r: ReconRead): boolean {
  return /^ok_2\d\d$/.test(r.lastVerdict ?? "") && r.openAlerts === 0;
}

export function parseNotifications(data: unknown): NotificationActivity | null {
  const d = obj(data);
  if (!("by_kind" in d)) return null;
  return {
    windowDays: num(d.window_days) || 7,
    total: num(d.total),
    byKind: arr(d.by_kind).map((r) => {
      const o = obj(r);
      return { kind: str(o.kind) ?? "", sent: num(o.sent), read: num(o.read), lastSentAt: str(o.last_sent_at) };
    }),
    perDay: arr(d.per_day).map((r) => ({ day: str(obj(r).day) ?? "", sent: num(obj(r).sent) })),
  };
}

export type OutboxRow = { id: string; template: string; status: string; attempts: number; createdAt: string | null; settledAt: string | null; lastError: string | null };
export type OutboxRead = { byStatus: Record<string, number>; rows: OutboxRow[]; waiting: number; failed: number };

export function parseOutbox(data: unknown): OutboxRead | null {
  const d = obj(data);
  if (!("rows" in d)) return null;
  const byStatus = counts(d.by_status);
  return {
    byStatus,
    waiting: (byStatus.PENDING ?? 0) + (byStatus.SENDING ?? 0) + (byStatus.FAILED ?? 0),
    failed: byStatus.FAILED ?? 0,
    rows: arr(d.rows).map((r) => {
      const o = obj(r);
      return { id: str(o.id) ?? "", template: str(o.template) ?? "", status: str(o.status) ?? "", attempts: num(o.attempts), createdAt: str(o.created_at), settledAt: str(o.settled_at), lastError: str(o.last_error) };
    }),
  };
}

export type HeldEventsRead = {
  heldCount: number;
  held: { id: string; title: string; host: string | null; reason: string | null; createdAt: string | null; startsAt: string | null }[];
  decisions: { eventId: string; title: string | null; action: string; at: string | null; by: string | null; reason: string | null }[];
};

export function parseHeldEvents(data: unknown): HeldEventsRead | null {
  const d = obj(data);
  if (!("held" in d)) return null;
  return {
    heldCount: num(d.held_count),
    held: arr(d.held).map((r) => {
      const o = obj(r);
      return { id: str(o.id) ?? "", title: str(o.title) ?? "An event", host: str(o.host_name), reason: str(o.hold_reason), createdAt: str(o.created_at), startsAt: str(o.starts_at) };
    }),
    decisions: arr(d.decisions).map((r) => {
      const o = obj(r);
      return { eventId: str(o.event_id) ?? "", title: str(o.title), action: str(o.action) ?? "", at: str(o.at), by: str(o.decided_by), reason: str(o.reason) };
    }),
  };
}

/** Everything the Operations panels read, each already settled. */
export type OpsReads = {
  deletions: OpsRead<DeletionsRead>;
  transfers: OpsRead<TransfersRead>;
  dbJobs: OpsRead<DbJobsRead>;
  recon: OpsRead<ReconRead>;
  notifications: OpsRead<NotificationActivity>;
  outbox: OpsRead<OutboxRead>;
  held: OpsRead<HeldEventsRead>;
};

/** What one call returned, as a settled read. */
export function settle<T>(result: { data: unknown; error: RpcError }, parse: (data: unknown) => T | null): OpsRead<T> {
  if (isMissingOpsFunction(result.error)) return { state: "missing" };
  if (result.error) return { state: "unavailable" };
  const parsed = parse(result.data);
  return parsed ? { state: "ok", data: parsed } : { state: "unavailable" };
}

/** Counts that wait on staff, for the tab badge. A read that did not load adds nothing. */
export function inFlightWaiting(r: Partial<OpsReads> | undefined): number {
  if (!r) return 0;
  return (
    (r.deletions?.state === "ok" ? r.deletions.data.waiting : 0) +
    (r.transfers?.state === "ok" ? r.transfers.data.waiting : 0) +
    (r.dbJobs?.state === "ok" ? r.dbJobs.data.failing : 0) +
    (r.held?.state === "ok" ? r.held.data.heldCount : 0) +
    (r.recon?.state === "ok" ? r.recon.data.openAlerts : 0)
  );
}

export function outboxWaiting(r: Partial<OpsReads> | undefined): number {
  return r?.outbox?.state === "ok" ? r.outbox.data.failed : 0;
}
