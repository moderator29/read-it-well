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
 * The dispute ruling is NOT here: it is a mutation
 * (`resolveEscrow` in `lib/admin/money-actions.ts`), called unchanged.
 */

type Client = SupabaseClient<Database>;
const UNAVAILABLE = { state: "unavailable" } as const;

/** One table row: the console's own `EscrowView`, plus the transitions it lacks. */
export type EscrowDeskRow = EscrowView & {
  fundedAt: string | null;
  releaseRequestedAt: string | null;
  disputedAt: string | null;
  /** For the badge slot beside each name. */
  payerId?: string;
  payeeId?: string;
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
      payerId: r.payer_id,
      payeeId: r.payee_id,
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

/* ======================================================================
 * THE EVIDENCE ON A DISPUTE, AND THE FLOAT'S DAILY BOOKING.
 *
 * Neither `escrow_evidence` nor `escrow_float_snapshots` is in the generated
 * types yet (both landed on 23 September; the types file is another
 * session's). So each read goes through one narrow untyped door that asks for
 * exactly the columns checked against the live table, and every field is
 * treated as unknown by the mappers below. When the types are regenerated
 * this door goes.
 * ==================================================================== */

type UntypedQuery = PromiseLike<{ data: unknown[] | null; error: unknown; count?: number | null }> & {
  in(column: string, values: string[]): UntypedQuery;
  order(column: string, options: { ascending: boolean }): UntypedQuery;
  range(from: number, to: number): UntypedQuery;
};
type UntypedDb = { from(table: string): { select(columns: string, options?: { count: "exact"; head: true }): UntypedQuery } };

function field(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return typeof v === "string" ? v : null;
}
function whole(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** One thing filed on a dispute, as the ruling panel prints it. */
export type EvidenceItem = {
  id: string;
  escrowId: string;
  kind: "file" | "fact";
  /** Which side filed it, from the escrow's own payer and payee. */
  side: "payer" | "payee" | "other";
  authorName: string | null;
  /** For the badge slot. */
  authorId?: string;
  fact: string | null;
  happenedOn: string | null;
  amountMinor: number | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  caption: string | null;
  createdAt: string;
  /** A short-lived signed link into the private `escrow-evidence` bucket; null when it could not be signed. */
  fileUrl: string | null;
};

/** Evidence rows into items per escrow, oldest first, each placed on its side. Pure, for the test. */
export function evidenceFromRows(
  rows: readonly Record<string, unknown>[],
  parties: ReadonlyMap<string, { payerId: string; payeeId: string }>,
  names: ReadonlyMap<string, string>,
  signed: ReadonlyMap<string, string>,
): Record<string, EvidenceItem[]> {
  const out: Record<string, EvidenceItem[]> = {};
  for (const row of rows) {
    const escrowId = field(row, "escrow_id");
    const id = field(row, "id");
    if (!escrowId || !id) continue;
    const author = field(row, "author_id") ?? "";
    const party = parties.get(escrowId);
    const path = field(row, "storage_path");
    const item: EvidenceItem = {
      id,
      escrowId,
      kind: field(row, "kind") === "file" ? "file" : "fact",
      side: party?.payerId === author ? "payer" : party?.payeeId === author ? "payee" : "other",
      authorName: names.get(author) ?? null,
      authorId: author,
      fact: field(row, "fact"),
      happenedOn: field(row, "happened_on"),
      amountMinor: whole(row, "amount_minor"),
      fileName: field(row, "file_name"),
      mimeType: field(row, "mime_type"),
      sizeBytes: whole(row, "size_bytes"),
      caption: field(row, "caption"),
      createdAt: field(row, "created_at") ?? new Date(0).toISOString(),
      fileUrl: path ? (signed.get(path) ?? null) : null,
    };
    (out[escrowId] ??= []).push(item);
  }
  for (const list of Object.values(out)) list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return out;
}

/** How long a signed evidence link lives: long enough to read, short enough not to be a share link. */
const EVIDENCE_LINK_SECONDS = 600;

/**
 * Everything filed on the given escrows, for the ruling panel. Select only:
 * `escrow_evidence_select_admin`, `escrows_select_admin`,
 * `profiles_select_admin`, and the bucket's `escrow_evidence_objects_admin_read`
 * for the signed links (read live on 23 September). A failed read is returned
 * as unavailable, never as "nothing filed": on a dispute that difference
 * decides whether an operator thinks one side filed nothing.
 */
export async function getDisputeEvidence(escrowIds: readonly string[]): Promise<AdminRead<Record<string, EvidenceItem[]>>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  if (escrowIds.length === 0) return { state: "ok", data: {} };
  const db: Client = access.supabase;
  const untyped = db as unknown as UntypedDb;
  try {
    const ids = [...new Set(escrowIds)];
    const [escrows, filed] = await Promise.all([
      db.from("escrows").select("id, payer_id, payee_id").in("id", ids),
      untyped
        .from("escrow_evidence")
        .select(
          "id, escrow_id, kind, author_id, fact, happened_on, amount_minor, file_name, storage_path, mime_type, size_bytes, caption, created_at",
        )
        .in("escrow_id", ids)
        .order("created_at", { ascending: true }),
    ]);
    if (escrows.error || filed.error) return UNAVAILABLE;
    const rows = (filed.data ?? []) as Record<string, unknown>[];
    const parties = new Map((escrows.data ?? []).map((e) => [e.id, { payerId: e.payer_id, payeeId: e.payee_id }]));

    const authors = [...new Set(rows.map((r) => field(r, "author_id")).filter((x): x is string => Boolean(x)))];
    const names = new Map<string, string>();
    if (authors.length > 0) {
      const { data, error } = await db.from("profiles").select("id, display_name").in("id", authors);
      if (error) return UNAVAILABLE;
      for (const p of data ?? []) if (p.display_name) names.set(p.id, p.display_name);
    }

    const paths = [...new Set(rows.map((r) => field(r, "storage_path")).filter((x): x is string => Boolean(x)))];
    const signed = new Map<string, string>();
    if (paths.length > 0) {
      try {
        const { data } = await db.storage.from("escrow-evidence").createSignedUrls(paths, EVIDENCE_LINK_SECONDS);
        paths.forEach((path, i) => {
          const url = data?.[i]?.signedUrl;
          if (url) signed.set(path, url);
        });
      } catch {
        /* Unsigned files are listed and say the file could not be opened. */
      }
    }
    return { state: "ok", data: evidenceFromRows(rows, parties, names, signed) };
  } catch {
    return UNAVAILABLE;
  }
}

/** One day's booking of the escrow float against the ledger. */
export type FloatSnapshot = {
  asOf: string;
  takenAt: string;
  floatMinor: number;
  ledgerFloatMinor: number;
  differenceMinor: number;
  escrowCount: number;
  commissionBookedMinor: number;
};

export type FloatHistory = {
  /** Oldest first. */
  points: FloatSnapshot[];
  /** Exact count of `escrow_float_snapshots`. */
  total: number;
  /** Days whose escrow float and ledger float differed. */
  unbalancedDays: number;
  lastUnbalanced: string | null;
  complete: boolean;
};

/** Snapshot rows into a series, oldest first, with the invariant tallied. Pure, for the test. */
export function floatHistoryFromRows(rows: readonly Record<string, unknown>[], total: number, complete: boolean): FloatHistory {
  const points: FloatSnapshot[] = [];
  for (const r of rows) {
    const asOf = field(r, "as_of");
    const floatMinor = whole(r, "float_minor");
    const ledgerFloatMinor = whole(r, "ledger_float_minor");
    const differenceMinor = whole(r, "difference_minor");
    if (!asOf || floatMinor === null || ledgerFloatMinor === null || differenceMinor === null) continue;
    points.push({
      asOf,
      takenAt: field(r, "taken_at") ?? `${asOf}T00:00:00Z`,
      floatMinor,
      ledgerFloatMinor,
      differenceMinor,
      escrowCount: whole(r, "escrow_count") ?? 0,
      commissionBookedMinor: whole(r, "commission_booked_minor") ?? 0,
    });
  }
  points.sort((a, b) => (a.asOf < b.asOf ? -1 : a.asOf > b.asOf ? 1 : 0));
  const unbalanced = points.filter((p) => p.differenceMinor !== 0);
  return {
    points,
    total,
    unbalancedDays: unbalanced.length,
    lastUnbalanced: unbalanced.length ? unbalanced[unbalanced.length - 1]!.asOf : null,
    complete: complete && points.length === total,
  };
}

/**
 * Every daily float snapshot (`escrow_float_snapshots`, under
 * `escrow_float_snapshots_select_admin`), checked against an exact count.
 * The invariant the table records is `difference_minor`: the escrow float
 * less the float the ledger books. Zero is balanced.
 */
export async function getEscrowFloatHistory(): Promise<AdminRead<FloatHistory>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;
  const untyped = access.supabase as unknown as UntypedDb;
  try {
    const [rows, head] = await Promise.all([
      readEvery<Record<string, unknown>>(async (from, to) => {
        const { data, error } = await untyped
          .from("escrow_float_snapshots")
          .select("as_of, taken_at, float_minor, ledger_float_minor, difference_minor, escrow_count, commission_booked_minor")
          .order("as_of", { ascending: true })
          .range(from, to);
        return { data: (data ?? null) as Record<string, unknown>[] | null, error };
      }),
      untyped.from("escrow_float_snapshots").select("id", { count: "exact", head: true }),
    ]);
    if (!rows || head.error) return UNAVAILABLE;
    return { state: "ok", data: floatHistoryFromRows(rows.rows, head.count ?? 0, rows.complete) };
  } catch {
    return UNAVAILABLE;
  }
}
