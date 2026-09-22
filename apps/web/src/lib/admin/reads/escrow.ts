import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";
import type { EscrowView } from "../money-queries";
import type { AdminRead } from "../queries";
import { exactCount, readEvery } from "./money";
import { ESCROW_STATES, pipelineFromWhole } from "./money-derive";
import type { EscrowPipeline, EscrowState } from "./money-types";

/**
 * THE ESCROW DESK'S READ. Select only, through the admin's RLS client
 * (`escrows_select_admin`, `listings_admin_all`, `profiles_select_admin`).
 *
 * Every escrow is read once, in chunks, and everything on the desk is
 * computed from that one set: the state pipeline, the purpose split, the
 * newest transitions across all seven timestamp columns, the float, and the
 * narrowed, numbered table page. The count reached is checked against an
 * exact count, so a figure is never the total of a capped list.
 *
 * The dispute ruling is NOT here: it is Session A's mutation
 * (`resolveEscrow` in `lib/admin/money-actions.ts`), called unchanged.
 */

type Client = SupabaseClient<Database>;
const UNAVAILABLE = { state: "unavailable" } as const;

/** One table row: the console's own `EscrowView`, plus the transitions it lacks. */
export type EscrowDeskRow = EscrowView & {
  fundedAt: string | null;
  releaseRequestedAt: string | null;
  disputedAt: string | null;
};

export type EscrowDesk = {
  pipeline: EscrowPipeline;
  /** HELD, RELEASE_REQUESTED and DISPUTED, over every escrow. */
  heldMinor: number;
  openCount: number;
  /** Every dispute on the platform, never paged: nobody waits behind a pager. */
  disputes: EscrowDeskRow[];
  table: { rows: EscrowDeskRow[]; total: number; page: number; pageSize: number };
  complete: boolean;
};

export type EscrowDeskFilter = {
  /** Matched against the listing title. */
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

type Row = {
  id: string;
  state: EscrowState;
  purpose: string;
  amount_minor: number;
  commission_minor: number | null;
  payer_id: string;
  payee_id: string;
  listing_id: string | null;
  payer_confirmed_at: string | null;
  payee_confirmed_at: string | null;
  inspection_confirmation_id: string | null;
  dispute_reason: string | null;
  resolution_note: string | null;
  auto_release_at: string | null;
  created_at: string;
  funded_at: string | null;
  held_at: string | null;
  release_requested_at: string | null;
  released_at: string | null;
  refunded_at: string | null;
  disputed_at: string | null;
  resolved_at: string | null;
  listings: { title: string } | null;
};

const COLUMNS =
  "id, state, purpose, amount_minor, commission_minor, payer_id, payee_id, listing_id, payer_confirmed_at, payee_confirmed_at, inspection_confirmation_id, dispute_reason, resolution_note, auto_release_at, created_at, funded_at, held_at, release_requested_at, released_at, refunded_at, disputed_at, resolved_at, listings ( title )";

/** Live states first, so "Live escrows" reads top down in the order money waits. */
export const LIVE_STATES: readonly EscrowState[] = ["INITIATED", "FUNDED", "HELD", "RELEASE_REQUESTED", "DISPUTED"];

/** The table's rows for a filter, newest first. Pure, for the test. */
export function narrowEscrows<T extends { state: string; created_at: string; listings: { title: string } | null }>(
  rows: readonly T[],
  filter: Omit<EscrowDeskFilter, "page" | "pageSize">,
): T[] {
  const term = (filter.q ?? "").trim().toLowerCase();
  const state = ESCROW_STATES.find((s) => s === filter.status);
  const fromMs = filter.from ? Date.parse(`${filter.from}T00:00:00+01:00`) : null;
  const toMs = filter.to ? Date.parse(`${filter.to}T23:59:59.999+01:00`) : null;
  return rows
    .filter((r) => {
      if (state ? r.state !== state : !LIVE_STATES.includes(r.state as EscrowState)) return false;
      if (term && !(r.listings?.title ?? "").toLowerCase().includes(term)) return false;
      const at = Date.parse(r.created_at);
      if (fromMs !== null && at < fromMs) return false;
      if (toMs !== null && at > toMs) return false;
      return true;
    })
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function getEscrowDesk(filter: EscrowDeskFilter): Promise<AdminRead<EscrowDesk>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const db: Client = access.supabase;

  try {
    const [all, count] = await Promise.all([
      readEvery<Row>((from, to) => db.from("escrows").select(COLUMNS).order("id").range(from, to)),
      exactCount(db.from("escrows").select("id", { count: "exact", head: true })),
    ]);
    if (!all || count === null) return UNAVAILABLE;

    const toView = (r: Row, names: Map<string, string>): EscrowDeskRow => ({
      id: r.id,
      state: r.state,
      purpose: r.purpose,
      amountMinor: r.amount_minor,
      commissionMinor: r.commission_minor,
      payerName: names.get(r.payer_id) ?? null,
      payeeName: names.get(r.payee_id) ?? null,
      listingTitle: r.listings?.title ?? null,
      payerConfirmed: r.payer_confirmed_at !== null,
      payeeConfirmed: r.payee_confirmed_at !== null,
      fromInspection: r.inspection_confirmation_id !== null,
      disputeReason: r.dispute_reason,
      resolutionNote: r.resolution_note,
      autoReleaseAt: r.auto_release_at,
      createdAt: r.created_at,
      heldAt: r.held_at,
      settledAt: r.released_at ?? r.refunded_at ?? r.resolved_at,
      fundedAt: r.funded_at,
      releaseRequestedAt: r.release_requested_at,
      disputedAt: r.disputed_at,
    });

    const narrowed = narrowEscrows(all.rows, filter);
    const pages = Math.max(1, Math.ceil(narrowed.length / filter.pageSize));
    const page = Math.min(Math.max(1, filter.page), pages);
    const pageRows = narrowed.slice((page - 1) * filter.pageSize, page * filter.pageSize);
    const disputeRows = all.rows
      .filter((r) => r.state === "DISPUTED")
      .sort((a, b) => Date.parse(a.disputed_at ?? a.created_at) - Date.parse(b.disputed_at ?? b.created_at));

    const people = [...new Set([...pageRows, ...disputeRows].flatMap((r) => [r.payer_id, r.payee_id]))];
    const names = new Map<string, string>();
    if (people.length > 0) {
      const { data, error } = await db.from("profiles").select("id, display_name").in("id", people);
      if (error) return UNAVAILABLE;
      for (const row of data ?? []) if (row.display_name) names.set(row.id, row.display_name);
    }

    const pipeline = pipelineFromWhole(
      all.rows.map((r) => ({
        id: r.id,
        state: r.state,
        purpose: r.purpose,
        amountMinor: r.amount_minor,
        listingTitle: r.listings?.title ?? null,
        createdAt: r.created_at,
        heldAt: r.held_at,
        settledAt: r.released_at ?? r.refunded_at ?? r.resolved_at,
        fundedAt: r.funded_at,
        releaseRequestedAt: r.release_requested_at,
        releasedAt: r.released_at,
        refundedAt: r.refunded_at,
        disputedAt: r.disputed_at,
        resolvedAt: r.resolved_at,
      })),
    );

    return {
      state: "ok",
      data: {
        pipeline,
        heldMinor: all.rows
          .filter((r) => ["HELD", "RELEASE_REQUESTED", "DISPUTED"].includes(r.state))
          .reduce((s, r) => s + r.amount_minor, 0),
        openCount: all.rows.filter((r) => ["INITIATED", "FUNDED", "HELD", "RELEASE_REQUESTED"].includes(r.state)).length,
        disputes: disputeRows.map((r) => toView(r, names)),
        table: { rows: pageRows.map((r) => toView(r, names)), total: narrowed.length, page, pageSize: filter.pageSize },
        complete: all.complete && all.rows.length === count,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
