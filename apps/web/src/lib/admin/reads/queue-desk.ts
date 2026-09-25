import "server-only";

import { requireAdmin } from "../guard";
import { readViewFilters, type QueueKind, type ReportSignals, type ViewFilters } from "../queue-desk";

/**
 * THE QUEUE DESK'S READS. V-89.
 *
 * All through the operator's own session, so the policies in
 * `20260924160400_v89_...sql` decide what comes back: claims and saved views
 * are readable by operators only, and the report signals function answers
 * nothing to anybody else. Each read fails into "nothing known", which the
 * page draws as an unclaimed row, an unweighted report or no saved views,
 * never as an error that blocks the queue.
 */

type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      in: (c: string, v: string[]) => PromiseLike<{ data: unknown; error: unknown }>;
      order: (c: string, o: { ascending: boolean }) => { limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export type ClaimRow = { kind: QueueKind; itemId: string; claimedBy: string; touchedAt: string };
export type SavedView = { id: string; name: string; filters: ViewFilters; shared: boolean; mine: boolean };
export type Operator = { id: string; name: string | null };

export type DeskReads = {
  me: string | null;
  claims: Map<string, ClaimRow>;
  signals: Map<string, ReportSignals>;
  views: SavedView[];
  operators: Operator[];
};

export async function loadDesk(itemIds: string[], reportIds: string[]): Promise<DeskReads> {
  const empty: DeskReads = { me: null, claims: new Map(), signals: new Map(), views: [], operators: [] };
  const access = await requireAdmin("moderation");
  if (access.state !== "admin") return empty;
  const db = access.supabase as unknown as Loose;

  const [claims, signals, views, operators] = await Promise.all([
    itemIds.length > 0
      ? db.from("queue_claims").select("kind, item_id, claimed_by, touched_at").in("item_id", itemIds.slice(0, 200))
      : Promise.resolve({ data: [], error: null }),
    reportIds.length > 0 ? db.rpc("admin_report_signals", { p_reports: reportIds.slice(0, 200) }) : Promise.resolve({ data: [], error: null }),
    db.from("admin_saved_views").select("id, owner, name, filters, shared").order("created_at", { ascending: false }).limit(30),
    (access.userClient as unknown as Loose).rpc("queue_operators"),
  ]);

  const out: DeskReads = { ...empty, me: access.user.id };
  if (!claims.error && Array.isArray(claims.data)) {
    for (const row of claims.data as { kind: QueueKind; item_id: string; claimed_by: string; touched_at: string }[]) {
      out.claims.set(`${row.kind}:${row.item_id}`, { kind: row.kind, itemId: row.item_id, claimedBy: row.claimed_by, touchedAt: row.touched_at });
    }
  }
  if (!signals.error && Array.isArray(signals.data)) {
    for (const row of signals.data as {
      report_id: string;
      phone_confirmed: boolean;
      attended_at: string | null;
      past_closed: number;
      past_upheld: number;
    }[]) {
      out.signals.set(row.report_id, {
        phoneConfirmed: row.phone_confirmed === true,
        attendedAt: row.attended_at,
        pastClosed: Number(row.past_closed) || 0,
        pastUpheld: Number(row.past_upheld) || 0,
      });
    }
  }
  if (!views.error && Array.isArray(views.data)) {
    out.views = (views.data as { id: string; owner: string; name: string; filters: unknown; shared: boolean }[]).map((v) => ({
      id: v.id,
      name: v.name,
      filters: readViewFilters(v.filters),
      shared: v.shared === true,
      mine: v.owner === access.user.id,
    }));
  }
  if (!operators.error && Array.isArray(operators.data)) {
    out.operators = (operators.data as { user_id: string; name: string | null }[]).map((o) => ({ id: o.user_id, name: o.name }));
  }
  return out;
}
