import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";

/**
 * THE MONEY DESK'S VIEW OF THE PAYLUK COMMISSION SWEEP (D51): the merchant
 * balance as last read, the last run, the last withdrawal and the last
 * failure. Read through `public.admin_payluk_commission_sweep()` on the
 * operator's own client, which decides on `private.staff_can(uid, 'finance')`.
 *
 * Every figure is the database's, in kobo. A balance never read is `null`,
 * never zero: "we have not looked" and "there is nothing there" are
 * different facts on a money desk.
 */

export type SweepRunView = {
  startedAt: string;
  outcome: string;
  mainMinor: number | null;
  escrowMinor: number | null;
  withdrawalMinor: number | null;
  errorCode: string | null;
  errorDetail: string | null;
};

export type SweepDesk =
  | {
      state: "ok";
      balance: { mainMinor: number; escrowMinor: number; currency: string; readAt: string } | null;
      lastRun: SweepRunView | null;
      lastWithdrawal: SweepRunView | null;
      lastFailure: SweepRunView | null;
      recent: SweepRunView[];
    }
  | { state: "forbidden" }
  | { state: "unavailable" };

function n(v: unknown): number | null {
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isSafeInteger(x) ? x : null;
}

function run(raw: unknown): SweepRunView | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.started_at !== "string" || typeof r.outcome !== "string") return null;
  return {
    startedAt: r.started_at,
    outcome: r.outcome,
    mainMinor: n(r.main_balance_minor),
    escrowMinor: n(r.escrow_balance_minor),
    withdrawalMinor: n(r.withdrawal_minor),
    errorCode: typeof r.error_code === "string" ? r.error_code : null,
    errorDetail: typeof r.error_detail === "string" ? r.error_detail : null,
  };
}

export function parseSweepDesk(raw: unknown): SweepDesk {
  if (!raw || typeof raw !== "object") return { state: "unavailable" };
  const r = raw as Record<string, unknown>;
  if (r.status === "forbidden") return { state: "forbidden" };
  if (r.status !== "ok") return { state: "unavailable" };
  const b = r.balance as Record<string, unknown> | null;
  const main = b ? n(b.main_minor) : null;
  const escrow = b ? n(b.escrow_minor) : null;
  return {
    state: "ok",
    balance:
      b && main !== null && escrow !== null && typeof b.read_at === "string"
        ? { mainMinor: main, escrowMinor: escrow, currency: typeof b.currency === "string" ? b.currency : "", readAt: b.read_at }
        : null,
    lastRun: run(r.last_run),
    lastWithdrawal: run(r.last_withdrawal),
    lastFailure: run(r.last_failure),
    recent: Array.isArray(r.recent) ? r.recent.map(run).filter((x): x is SweepRunView => x !== null) : [],
  };
}

export async function readSweepDesk(caller: SupabaseClient<Database>): Promise<SweepDesk> {
  try {
    const { data, error } = await caller.rpc("admin_payluk_commission_sweep" as never);
    if (error) return { state: "unavailable" };
    return parseSweepDesk(data);
  } catch {
    return { state: "unavailable" };
  }
}
