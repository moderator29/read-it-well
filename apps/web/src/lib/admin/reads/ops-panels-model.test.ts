import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  dbJobState,
  inFlightWaiting,
  isMissingOpsFunction,
  outboxWaiting,
  parseDbJobs,
  parseDeletions,
  parseHeldEvents,
  parseNotifications,
  parseOutbox,
  parseRecon,
  parseTransfers,
  reconHealthy,
  settle,
  type OpsReads,
} from "./ops-panels-model";

const ROOT = join(__dirname, "../../../../../..");
const DRAFT = readFileSync(join(ROOT, "supabase/migrations/pending/op01_operations_reads.sql"), "utf8");
const PROBE = readFileSync(join(ROOT, "supabase/tests/probes-pending/op01-operations-reads.sql"), "utf8");

describe("a missing function keeps the old panels", () => {
  it("reads PostgREST's and Postgres's no-such-function answers as missing", () => {
    expect(isMissingOpsFunction({ code: "PGRST202" })).toBe(true);
    expect(isMissingOpsFunction({ code: "42883" })).toBe(true);
    expect(isMissingOpsFunction({ message: "Could not find the function public.staff_ops_email_outbox without parameters" })).toBe(true);
    expect(isMissingOpsFunction({ code: "42501", message: "not permitted" })).toBe(false);
    expect(isMissingOpsFunction(null)).toBe(false);
  });

  it("settles missing, unavailable and ok apart", () => {
    expect(settle({ data: null, error: { code: "PGRST202" } }, parseOutbox)).toEqual({ state: "missing" });
    expect(settle({ data: null, error: { code: "42501" } }, parseOutbox)).toEqual({ state: "unavailable" });
    expect(settle({ data: { nonsense: true }, error: null }, parseOutbox)).toEqual({ state: "unavailable" });
    expect(settle({ data: { by_status: {}, rows: [] }, error: null }, parseOutbox).state).toBe("ok");
  });
});

describe("the parsers", () => {
  it("counts what waits on staff", () => {
    const del = parseDeletions({ by_status: { SCHEDULED: 2, PURGING: 1, PURGED: 9 }, rows: [{ member_ref: "ab12cd34", status: "SCHEDULED", requested_at: "2026-10-01T00:00:00Z", attempts: 0 }] });
    expect(del?.waiting).toBe(3);
    expect(del?.rows[0]?.memberRef).toBe("ab12cd34");
    expect(parseTransfers({ by_status: { PENDING: 4, ACCEPTED: 1 }, rows: [] })?.waiting).toBe(4);
    const out = parseOutbox({ by_status: { PENDING: 1, SENDING: 1, FAILED: 2, SENT: 40 }, rows: [] });
    expect(out?.waiting).toBe(4);
    expect(out?.failed).toBe(2);
  });

  it("marks a failing, paused and idle database job", () => {
    const base = { name: "j", schedule: "* * * * *", active: true, lastStatus: "succeeded", lastStart: "2026-10-13T00:00:00Z", lastMs: 5, lastMessage: null, failed24h: 0 };
    expect(dbJobState(base)).toBe("ok");
    expect(dbJobState({ ...base, failed24h: 2 })).toBe("failed");
    expect(dbJobState({ ...base, lastStatus: "failed" })).toBe("failed");
    expect(dbJobState({ ...base, active: false })).toBe("paused");
    expect(dbJobState({ ...base, lastStart: null, lastStatus: null })).toBe("never");
    const jobs = parseDbJobs({ available: true, jobs: [{ name: "a", schedule: "x", active: true, failed_24h: 1 }, { name: "b", schedule: "y", active: true, last_start: "2026-10-13T00:00:00Z", last_status: "succeeded" }] });
    expect(jobs?.failing).toBe(1);
    expect(parseDbJobs({ jobs: [] })).toBeNull();
  });

  it("judges the reconciliation watch", () => {
    const ok = parseRecon({ watch: { last_verdict: "ok_200" }, runs: [{ action: "wallet.reconciliation.run", at: "2026-10-13T00:00:00Z" }], open_alerts: 0 });
    expect(ok && reconHealthy(ok)).toBe(true);
    const bad = parseRecon({ watch: { last_verdict: "wrong_body_200" }, runs: [], open_alerts: 0 });
    expect(bad && reconHealthy(bad)).toBe(false);
    const alerting = parseRecon({ watch: { last_verdict: "ok_200" }, runs: [], open_alerts: 1 });
    expect(alerting && reconHealthy(alerting)).toBe(false);
  });

  it("shapes notifications as the existing activity type", () => {
    const n = parseNotifications({ window_days: 7, total: 5, by_kind: [{ kind: "x", sent: 5, read: 2, last_sent_at: "2026-10-13T00:00:00Z" }], per_day: [{ day: "2026-10-13", sent: 5 }] });
    expect(n).toEqual({ windowDays: 7, total: 5, byKind: [{ kind: "x", sent: 5, read: 2, lastSentAt: "2026-10-13T00:00:00Z" }], perDay: [{ day: "2026-10-13", sent: 5 }] });
  });

  it("reads held events and their decisions", () => {
    const h = parseHeldEvents({ held_count: 2, held: [{ id: "e1", title: "Rooftop party", host_name: "Ada" }], decisions: [{ event_id: "e0", action: "moderation.remove", at: "2026-10-12T00:00:00Z" }] });
    expect(h?.heldCount).toBe(2);
    expect(h?.held[0]?.host).toBe("Ada");
    expect(h?.decisions[0]?.action).toBe("moderation.remove");
  });

  it("totals the in-flight tab badge from only the reads that loaded", () => {
    const reads: Partial<OpsReads> = {
      deletions: { state: "ok", data: { byStatus: {}, rows: [], waiting: 2 } },
      transfers: { state: "missing" },
      dbJobs: { state: "ok", data: { available: true, jobs: [], failing: 1 } },
      held: { state: "unavailable" },
    };
    expect(inFlightWaiting(reads)).toBe(3);
    expect(inFlightWaiting(undefined)).toBe(0);
    expect(outboxWaiting({ outbox: { state: "ok", data: { byStatus: {}, rows: [], waiting: 3, failed: 1 } } })).toBe(1);
  });
});

describe("the draft SQL", () => {
  const FUNCTIONS = ["staff_ops_account_deletions", "staff_ops_business_transfers", "staff_ops_database_jobs", "staff_ops_reconciliation", "staff_ops_notifications", "staff_ops_email_outbox", "staff_ops_held_events"];

  it("defines every read as a pinned security definer behind staff_can", () => {
    for (const fn of FUNCTIONS) {
      const at = DRAFT.indexOf(`create or replace function public.${fn}(`);
      expect(at, fn).toBeGreaterThan(-1);
      const head = DRAFT.slice(at, at + 700);
      expect(head, fn).toMatch(/security definer\s+set search_path = ''/);
      expect(head, fn).toMatch(/private\.staff_can\(\(select auth\.uid\(\)\), '(operations|moderation)'\)/);
      expect(DRAFT, fn).toMatch(new RegExp(`grant execute on function public\\.${fn}\\(.*\\) to authenticated`));
      expect(DRAFT, fn).toMatch(new RegExp(`revoke all on function public\\.${fn}\\(.*\\) from public, anon`));
      expect(PROBE, fn).toContain(fn);
    }
  });

  it("only reads, never drops or deletes, and never selects a secret or a payload", () => {
    const code = DRAFT.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(code).not.toMatch(/\b(drop|delete|insert|update|truncate)\b/i);
    expect(code).not.toMatch(/\bj\.command\b|\bpayload\b|dedupe_key|decrypted_secret|\bphone\b|\bemail\b\s+as/i);
  });

  it("ends its probe in a rolled back TEST_RESULT", () => {
    expect(PROBE).toMatch(/raise exception 'TEST_RESULT op01-operations-reads/);
  });
});
